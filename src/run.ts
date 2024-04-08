import initialiseAppInsights from './utils/appInsights'
import applicationInfo from './utils/applicationInfo'

import config, { type Environment } from './config'
import type { ComponentInfo, Dependency } from './data/ComponentInfo'
import gatherDependencyInfo from './dependency-info-gatherer'
import getComponents from './data/serviceCatalogue'
import getDependencies from './data/appInsights'
import { createRedisClient } from './data/redis/redisClient'
import RedisService from './data/redis/redisService'
import logger from './utils/logger'

initialiseAppInsights(applicationInfo())

const gatherComponentDependencies = async (env: Environment, components: ComponentInfo) => {
  const dependencies: Dependency[] = await getDependencies(env)
  return components.getKnownComponents().concat(dependencies)
}

const run = async () => {
  const redisClient = createRedisClient()
  await redisClient.connect()

  const redisService = new RedisService(redisClient)

  logger.info(`Starting to gather dependency info`)

  const components = await getComponents(config.serviceCatalogueUrl)
  const dependencies = await gatherComponentDependencies(config.environments.dev, components)
  const componentMap = components.getComponentMap(dependencies)

  const { categoryToComponent, componentDependencyInfo } = await gatherDependencyInfo(componentMap)

  const categoryCounts = Object.entries(categoryToComponent).map(([category, comps]) => `${category} =>  ${comps.length}`)
  logger.info(`Category freqs: \n${categoryCounts.join('\n')}`)

  logger.info(`Starting to publish dependency info`)

  const all = { componentDependencyInfo, categoryToComponent }
  await redisService.write(all)

  logger.info(`Finished publishing dependency info for ${Object.keys(componentMap).length} components`)
  await redisClient.quit()
}

run().catch(e => {
  logger.error(e)
  process.exit(1)
})
