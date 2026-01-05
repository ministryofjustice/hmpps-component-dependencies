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
import { DependencyCountService } from './dependency-count-sc-update'

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
  const dependencyCountService = new DependencyCountService() // Create an instance of the class
  await dependencyCountService.updateServiceCatalogueComponentDependentCount(componentDependencies, components, componentService)

  await redisClient.quit()
  await flush()
}

run().catch(async e => {
  logger.error(e)
  await flush()
  process.exit(1)
})
