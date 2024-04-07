import initialiseAppInsights from './utils/appInsights'
import applicationInfo from './utils/applicationInfo'

import config from './config'
import gatherDependencyInfo from './dependency-info-gatherer'
import getComponents from './data/serviceCatalogue'
import getDependencies from './data/appInsights'
import { createRedisClient } from './data/redis/redisClient'
import RedisService from './data/redis/redisService'
import logger from './utils/logger'

initialiseAppInsights(applicationInfo())

const run = async () => {
  const redisClient = createRedisClient()
  await redisClient.connect()

  const redisService = new RedisService(redisClient)

  logger.info(`Starting to gather dependency info`)

  const components = await getComponents(config.serviceCatalogueUrl)
  const dependencies = await getDependencies(config.environments.dev)
  const componentMap = components.buildComponentMap(dependencies)

  const { categoryToComponent, componentDependencyInfo, missingServices } = gatherDependencyInfo(componentMap)

  logger.info(`Services missing from service catalogue: \n\t${missingServices.join('\n\t')}`)

  const categoryCounts = Object.entries(categoryToComponent).map(([category, comps]) => `${category} =>  ${comps.length}`)
  logger.info(`Category freqs: \n${categoryCounts.join('\n')}`)

  logger.info(`Starting to publish dependency info`)
  await redisService.write({ componentDependencyInfo, categoryToComponent })

  logger.info(`Finished publishing dependency info for ${Object.keys(componentMap).length} components`)
  await redisClient.quit()
}

run().catch(e => {
  logger.error(e)
  process.exit(1)
})
