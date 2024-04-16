import initialiseAppInsights from './utils/appInsights'
import applicationInfo from './utils/applicationInfo'

import config, { type Environment } from './config'
import gatherDependencyInfo from './dependency-info-gatherer'
import getComponents from './data/serviceCatalogue'
import getDependencies from './data/appInsights'
import { createRedisClient } from './data/redis/redisClient'
import RedisService from './data/redis/redisService'
import logger from './utils/logger'
import { type Components } from './data/Components'

initialiseAppInsights(applicationInfo())

const calculateDependencies = async ({ env, appInsightsCreds }: Environment, components: Components) => {
  const dependencies = await getDependencies(appInsightsCreds)
  const componentMap = components.buildComponentMap(dependencies)
  const { categoryToComponent, componentDependencyInfo, missingServices } = gatherDependencyInfo(componentMap)

  logger.info(`${env}: Services missing from service catalogue: \n\t${missingServices.join('\n\t')}`)

  const categoryCounts = Object.entries(categoryToComponent).map(([category, comps]) => `${category} =>  ${comps.length}`)
  logger.info(`${env}: Category freqs: \n${categoryCounts.join('\n')}`)

  return [env, { categoryToComponent, componentDependencyInfo, missingServices }]
}

const run = async () => {
  const redisClient = createRedisClient()
  await redisClient.connect()

  const redisService = new RedisService(redisClient)

  logger.info(`Starting to gather dependency info`)

  const components = await getComponents(config.serviceCatalogueUrl)

  const componentDependencies = await Promise.all(config.environments.map(environment => calculateDependencies(environment, components)))

  logger.info(`Starting to publish dependency info`)
  await redisService.write(Object.fromEntries(componentDependencies))
  logger.info(`Finished publishing dependency info`)

  await redisClient.quit()
}

run().catch(e => {
  logger.error(e)
  process.exit(1)
})
