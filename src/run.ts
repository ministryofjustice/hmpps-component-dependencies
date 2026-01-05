import initialiseAppInsights, { flush } from './utils/appInsights'
import applicationInfo from './utils/applicationInfo'

import config, { EnvType, type Environment } from './config'
import gatherDependencyInfo, { type DependencyInfo } from './dependency-info-gatherer'
import ComponentService from './data/serviceCatalogue'
import getDependencies from './data/appInsights'
import { createRedisClient } from './data/redis/redisClient'
import RedisService from './data/redis/redisService'
import logger from './utils/logger'
import { type Components, Component } from './data/Components'
import { dependencyCountCalculator } from './dependency-count-calculator'

initialiseAppInsights(applicationInfo())

const calculateDependencies = async (
  { env, appInsightsCreds }: Environment,
  components: Components,
): Promise<[EnvType, DependencyInfo]> => {
  const dependencies = await getDependencies(appInsightsCreds)
  const componentMap = components.buildComponentMap(dependencies)
  const { categoryToComponent, componentDependencyInfo, missingServices } = gatherDependencyInfo(componentMap)

  logger.info(`${env}: Services missing from service catalogue: \n\t${missingServices.join('\n\t')}`)

  const categoryCounts = Object.entries(categoryToComponent).map(
    ([category, comps]) => `${category} =>  ${comps.length}`,
  )
  logger.info(`${env}: Category freqs: \n${categoryCounts.join('\n')}`)

  return [env, { categoryToComponent, componentDependencyInfo, missingServices }]
}

const updateServiceCatalogueComponentDependentCount = async (
  componentDependencies: [EnvType, DependencyInfo][],
  components: Components,
  componentService: ComponentService,
): Promise<void> => {
  const validComponents = Array.isArray(components.components) ? components.components : ([] as Component[])
  const prodDependencyTuple = componentDependencies.find(([env]) => env === 'PROD')

  if (!prodDependencyTuple) {
    logger.warn('No PROD environment found in componentDependencies.')
    return
  }

  const [, prodDependencyInfo] = prodDependencyTuple
  const prodDependencies = prodDependencyInfo.componentDependencyInfo

  // Use the updated dependencyCountCalculator to get dependency counts along with documentId
  const dependencyCounts = dependencyCountCalculator.getDependencyCounts(prodDependencies, validComponents)

  // Loop through the returned data and call putComponent
  for (const { componentName, dependentCount, documentId } of dependencyCounts) {
    logger.info(`Processing component: ${componentName}`)

    if (documentId) {
      componentService.putComponent(documentId, dependentCount)
      logger.info(`Updated dependency count of component ${componentName} to ${dependentCount}`)
    } else {
      logger.info(`Missing service catalogue component ${componentName}`)
    }
  }
}

const run = async () => {
  const componentService = new ComponentService()
  const redisClient = createRedisClient()
  await redisClient.connect()

  const redisService = new RedisService(redisClient)

  logger.info(`Starting to gather dependency info`)

  const components = await componentService.getComponents()
  const componentDependencies = (await Promise.all(
    config.environments.map(environment => calculateDependencies(environment, components)),
  )) as [EnvType, DependencyInfo][]

  logger.info(`Starting to publish dependency info in Redis`)

  const data = Object.fromEntries(componentDependencies)

  await redisService.write(data)

  logger.info(`Finished publishing dependency info in Redis`)

  logger.info(`Starting update of service catalogue with dependent counts`)
  await updateServiceCatalogueComponentDependentCount(componentDependencies, components, componentService)

  await redisClient.quit()
  await flush()
}

run().catch(async e => {
  logger.error(e)
  await flush()
  process.exit(1)
})
