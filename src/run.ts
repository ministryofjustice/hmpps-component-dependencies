import initialiseAppInsights, { flush } from './utils/appInsights'
import applicationInfo from './utils/applicationInfo'
import { createRedisClient } from './data/redis/redisClient'
import RedisService from './data/redis/redisService'
import config from './config'
import ComponentService from './data/serviceCatalogue/componentService'
import EnvironmentService from './data/serviceCatalogue/environmentService'

import { AppInsightsServiceFactory } from './data/appInsights/appInsightsService'
import logger from './utils/logger'
import { DependencyCountService } from './tasks/dependencyCountUpdater'
import { MessagingInfoService } from './tasks/messagingInfoUpdate'
import { Client } from './data/serviceCatalogue/Client'
import DependencyCalculator from './dependencyCalculator'
import { DependencyInfoGatherer } from './tasks/dependencyInfoGatherer'

initialiseAppInsights(applicationInfo())

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy
const serviceCatalogueProxyEnv = (
  config.serviceCatalogue.agent as {
    proxyEnv?: { http_proxy?: string; https_proxy?: string; no_proxy?: string }
  }
).proxyEnv
logger.info(
  {
    proxyMode: proxyUrl ? 'ENABLED' : 'DISABLED',
    proxyConfigured: Boolean(proxyUrl),
    noProxyConfigured: Boolean(process.env.NO_PROXY || process.env.no_proxy),
    serviceCatalogueProxyConfigured: Boolean(
      serviceCatalogueProxyEnv?.https_proxy || serviceCatalogueProxyEnv?.http_proxy,
    ),
    serviceCatalogueNoProxyConfigured: Boolean(serviceCatalogueProxyEnv?.no_proxy),
  },
  'Outbound proxy mode',
)

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
