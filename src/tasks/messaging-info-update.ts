import type { EnvType, Environment } from '../config'
import type { AppInsightsServiceFactory } from '../data/appInsights/appInsightsService'
import type { Components, MessagingConfig } from '../data/Components'
import type EnvironmentService from '../data/serviceCatalogue/environmentService'
import logger from '../utils/logger'

export class MessagingConfigService {
  constructor(
    private readonly environmentService: EnvironmentService,
    private readonly appInsightsServiceFactory: AppInsightsServiceFactory,
  ) {}

  async updateMessagingConfig(environments: Environment[], components: Components): Promise<void> {
    const messagingConfigByEnvironment = await this.gatherMessagingConfig(environments)
    await this.environmentService.updateMessagingConfig(messagingConfigByEnvironment, components)
  }

  private async gatherMessagingConfig(environments: Environment[]): Promise<[EnvType, MessagingConfig[]][]> {
    const results: [EnvType, MessagingConfig[]][] = []

    for (const environment of environments) {
      const messagingConfig = await this.appInsightsServiceFactory(environment.appInsightsCreds).getMessagingConfig()
      logger.info(`${environment.env}: Retrieved messaging config for ${messagingConfig.length} components`)
      results.push([environment.env, messagingConfig])
    }

    return results
  }
}

export default MessagingConfigService
