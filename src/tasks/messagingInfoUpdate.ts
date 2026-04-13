import type { EnvType, Environment } from '../config'
import type { AppInsightsServiceFactory } from '../data/appInsights/appInsightsService'
import type { Components, MessagingInfo } from '../data/Components'
import type EnvironmentService from '../data/serviceCatalogue/environmentService'
import logger from '../utils/logger'

export class MessagingInfoService {
  constructor(
    private readonly environmentService: EnvironmentService,
    private readonly appInsightsServiceFactory: AppInsightsServiceFactory,
  ) {}

  async updateMessagingInfo(environments: Environment[], components: Components): Promise<void> {
    const messagingInfoByEnvironment = await this.gatherMessagingInfo(environments)
    await this.environmentService.updateMessagingInfo(messagingInfoByEnvironment, components)
  }

  private async gatherMessagingInfo(environments: Environment[]): Promise<[EnvType, MessagingInfo[]][]> {
    const results: [EnvType, MessagingInfo[]][] = []

    for (const environment of environments) {
      // eslint-disable-next-line no-await-in-loop -- Intentionally sequential to keep per-environment logging and control query pacing.
      const messagingInfo = await this.appInsightsServiceFactory(environment.appInsightsCreds).getMessagingInfo()
      logger.info(`${environment.env}: Retrieved messaging config for ${messagingInfo.length} components`)
      results.push([environment.env, messagingInfo])
    }

    return results
  }
}

export default MessagingInfoService
