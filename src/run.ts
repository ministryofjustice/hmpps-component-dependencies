import initialiseAppInsights, { flush } from './utils/appInsights'
import applicationInfo from './utils/applicationInfo'

import config, { EnvType, type Environment } from './config'
import gatherDependencyInfo, { type DependencyInfo } from './dependency-info-gatherer'
import ComponentService from './data/serviceCatalogue'
import appInsightsService from './data/appInsights'
import { createRedisClient } from './data/redis/redisClient'
import RedisService from './data/redis/redisService'
import logger from './utils/logger'
import { type Components, type MessagingConfig } from './data/Components'
import { DependencyCountService } from './dependency-count-sc-update'

initialiseAppInsights(applicationInfo())

const calculateDependencies = async (
  { env, appInsightsCreds }: Environment,
  components: Components,
): Promise<[EnvType, DependencyInfo]> => {
  const dependencies = await appInsightsService.getDependencies(appInsightsCreds)
  const componentMap = components.buildComponentMap(dependencies)
  const { categoryToComponent, componentDependencyInfo, missingServices } = gatherDependencyInfo(componentMap)

  logger.info(`${env}: Services missing from service catalogue: \n\t${missingServices.join('\n\t')}`)

  const categoryCounts = Object.entries(categoryToComponent).map(
    ([category, comps]) => `${category} =>  ${comps.length}`,
  )
  logger.info(`${env}: Category freqs: \n${categoryCounts.join('\n')}`)

  return [env, { categoryToComponent, componentDependencyInfo, missingServices }]
}

const getAwsMessagingConfig = async ({ env, appInsightsCreds }: Environment): Promise<[EnvType, MessagingConfig[]]> => {
  logger.info(`Getting AWS Messaging Config for ${env} environment`)
  const messagingConfig = await appInsightsService.getMessagingConfig(appInsightsCreds)
  logger.info(`${env}: Messaging config records: ${messagingConfig.length}`)
  logger.info(`${env}: Messaging config records:`, messagingConfig)
  return [env, messagingConfig]
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
  const dependencyCountService = new DependencyCountService()
  await dependencyCountService.updateServiceCatalogueComponentDependentCount(
    componentDependencies,
    components,
    componentService,
  )

  const messagingConfigByEnvironment: [EnvType, MessagingConfig[]][] = []
  for (const environment of config.environments) {
    // if (environment.env !== EnvType.PROD) {
    // eslint-disable-next-line no-await-in-loop
    const messagingConfig = await getAwsMessagingConfig(environment)
    messagingConfigByEnvironment.push(messagingConfig)
    // }
  }
  logger.info(`Starting update of service catalogue environments with aws_messaging_config`)
  await componentService.updateEnvironmentAwsMessagingConfig(messagingConfigByEnvironment, components)
  logger.info(`Finished update of service catalogue environments with aws_messaging_config`)

  await redisClient.quit()
  await flush()
}

run().catch(async e => {
  logger.error(e)
  await flush()
  process.exit(1)
})
