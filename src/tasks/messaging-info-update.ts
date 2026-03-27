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
    const MessagingInfoByEnvironment = await this.gatherMessagingInfo(environments)
    await this.environmentService.updateMessagingInfo(MessagingInfoByEnvironment, components)
  }

  private async gatherMessagingInfo(environments: Environment[]): Promise<[EnvType, MessagingInfo[]][]> {
    const results: [EnvType, MessagingInfo[]][] = []

    for (const environment of environments) {
      const MessagingInfo = await this.appInsightsServiceFactory(environment.appInsightsCreds).getMessagingInfo()
      logger.info(`${environment.env}: Retrieved messaging config for ${MessagingInfo.length} components`)
      results.push([environment.env, MessagingInfo])
    }

    return results
  }
}

export default MessagingInfoService
