import initialiseAppInsights, { flush } from './utils/appInsights'
import applicationInfo from './utils/applicationInfo'

import config, { EnvType, type Environment } from './config'
import gatherDependencyInfo, { type DependencyInfo } from './dependency-info-gatherer'
import ComponentService from './data/serviceCatalogue'
import getDependencies from './data/appInsights'
import { createRedisClient } from './data/redis/redisClient'
import RedisService from './data/redis/redisService'
import logger from './utils/logger'
import { type Components } from './data/Components'
import { type ServiceCatalogueComponent } from './data/serviceCatalogue/Client'
import { type ComponentInfo } from './dependency-info-gatherer'

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

const run = async () => {
  const componentService = new ComponentService();
  const redisClient = createRedisClient()
  await redisClient.connect()

  const redisService = new RedisService(redisClient)

  logger.info(`Starting to gather dependency info`)

  const components = await componentService.getComponents()
  const componentDependencies = await Promise.all(
    config.environments.map(environment => calculateDependencies(environment, components)),
  ) as [EnvType, DependencyInfo][]

  logger.info(`Starting to publish dependency info`)

  const data = Object.fromEntries(componentDependencies)

  await redisService.write(data)

  logger.info(`Finished publishing dependency info`)

  logger.info('Updating service catalogue with dependent counts')
  const validComponents = Array.isArray(components.components) 
    ? components.components
    : [] as ServiceCatalogueComponent[]
  logger.info(`${JSON.stringify(validComponents, null, 2)}`)
  const prodDependencyTuple = componentDependencies.find(([env]) => env === "PROD")
  if (prodDependencyTuple) {
    const [, prodDependencyInfo] = prodDependencyTuple
    const prodDependencies = prodDependencyInfo.componentDependencyInfo
  
    for (const componentName of Object.keys(prodDependencies)) {
      const details = prodDependencies[componentName] || {} as ComponentInfo
      const dependents = details.dependents || []
      const dependent_count = dependents.length
      const matchingComponent = validComponents.find(
        component => component.name === componentName
      )
      const documentId = matchingComponent.documentId
      if (documentId) {
        // await componentService.postComponent(documentId, dependent_count)
        logger.info(`Component ${componentName} has ${dependent_count} dependents.`)
      } else {
        logger.warn(`Component with name ${componentName} not found in components list.`)
      }
    }
  } else {
    logger.warn("No PROD environment found in componentDependencies.")
  }

  await redisClient.quit()
  await flush()

}

run().catch(async e => {
  logger.error(e)
  await flush()
  process.exit(1)
})
