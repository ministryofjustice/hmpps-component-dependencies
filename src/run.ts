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
import { type DependentCount } from './dependency-count-calculator'
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
  prodDependencyTuple: [string, DependencyInfo],
  validComponents: Component[],
  componentService: ComponentService,
  // dependencyCountCalculator: DependencyCountCalculator, // New parameter for dependency count calculation
): Promise<void> => {
  const [, prodDependencyInfo] = prodDependencyTuple
  const prodDependencies = prodDependencyInfo.componentDependencyInfo

  // Use the dependencyCountCalculator to calculate dependency counts
  const dependencyCounts: Array<DependentCount> = dependencyCountCalculator.getDependencyCounts(prodDependencies)

  // Create an array of promises for concurrent execution
  const promises = dependencyCounts.map(async ([componentName, dependentCount]) => {
    logger.info(`Processing component: ${componentName}`)

    const matchingComponent = validComponents.find(component => component.name === componentName)

    if (matchingComponent && matchingComponent.documentId) {
      const { documentId } = matchingComponent
      await componentService.putComponent(documentId, dependentCount)
      logger.info(`Setting dependency count of component ${componentName} to ${dependentCount}`)
    } else {
      logger.info(`Missing service catalogue component ${componentName} ${JSON.stringify(matchingComponent)}`)
    }
  })

  // Wait for all promises to resolve
  await Promise.all(promises)
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
  const validComponents = Array.isArray(components.components) ? components.components : ([] as Component[])
  const prodDependencyTuple = componentDependencies.find(([env]) => env === 'PROD')
  if (prodDependencyTuple) {
    await updateServiceCatalogueComponentDependentCount(prodDependencyTuple, validComponents, componentService)
    logger.info(`Finished updating service catalogue with dependent counts`)
  } else {
    logger.warn(`No PROD environment found in componentDependencies.`)
  }

  await redisClient.quit()
  await flush()
}

run().catch(async e => {
  logger.error(e)
  await flush()
  process.exit(1)
})
