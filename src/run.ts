import initialiseAppInsights, { flush } from './utils/appInsights'
import applicationInfo from './utils/applicationInfo'

import config from './config'
import ComponentService from './data/serviceCatalogue/componentService'
import EnvironmentService from './data/serviceCatalogue/environmentService'

import { AppInsightsServiceFactory } from './data/appInsights/appInsightsService'
import { createRedisClient } from './data/redis/redisClient'
import RedisService from './data/redis/redisService'
import logger from './utils/logger'
import { DependencyCountService } from './tasks/dependency-count-updater'
import { MessagingInfoService } from './tasks/messaging-info-update'
import { Client } from './data/serviceCatalogue/Client'
import DependencyCalculator from './dependency-calculator'
import { DependencyInfoGatherer } from './tasks/dependency-info-gatherer'

initialiseAppInsights(applicationInfo())

const run = async () => {
  const client = new Client()
  const componentService = new ComponentService(client)
  const environmentService = new EnvironmentService(client)

  const redisClient = createRedisClient()
  await redisClient.connect()

  logger.info(`Starting to gather dependency info`)

  const components = await componentService.getComponents()

  const dependencyCalculator = new DependencyCalculator(AppInsightsServiceFactory, new DependencyInfoGatherer())
  const componentDependencies = await dependencyCalculator.calculateDependencies(components)

  logger.info(`Starting to publish dependency info in Redis`)
  const redisService = new RedisService(redisClient)
  try {
    await redisService.write(componentDependencies)
  } finally {
    await redisClient.quit()
  }
  logger.info(`Finished publishing dependency info in Redis`)

  logger.info(`Starting update of service catalogue with dependent counts`)
  const dependencyCountService = new DependencyCountService(componentService)
  await dependencyCountService.updateComponentDependentCount(componentDependencies, components)
  logger.info(`Finished update of service catalogue with dependent counts`)

  logger.info(`Starting update of service catalogue environments.aws_messaging_config`)
  const messagingInfoService = new MessagingInfoService(environmentService, AppInsightsServiceFactory)
  await messagingInfoService.updateMessagingInfo(config.environments, components)
  logger.info(`Finished update of service catalogue environments.aws_messaging_config`)

  await flush()
}

run().catch(async e => {
  logger.error(e)
  await flush()
  process.exit(1)
})
