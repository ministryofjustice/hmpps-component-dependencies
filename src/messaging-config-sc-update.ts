import { type AppInsightsCreds, EnvType, type Environment } from './config'
import appInsightsService from './data/appInsights'
import { type Components, type MessagingConfig } from './data/Components'
import ComponentService from './data/serviceCatalogue'
import logger from './utils/logger'

export type MessagingConfigFetcher = (creds: AppInsightsCreds) => Promise<MessagingConfig[]>

export class MessagingConfigService {
  constructor(
    private readonly fetchMessagingConfig: MessagingConfigFetcher = creds =>
      appInsightsService.getMessagingConfig(creds),
  ) {}

  async gatherMessagingConfig(environments: Environment[]): Promise<[EnvType, MessagingConfig[]][]> {
    const results: [EnvType, MessagingConfig[]][] = []

    for (const environment of environments) {
      // eslint-disable-next-line no-await-in-loop
      const messagingConfig = await this.fetchMessagingConfig(environment.appInsightsCreds)
      logger.info(`${environment.env}: Retrieved messaging config for ${messagingConfig.length} components`)
      results.push([environment.env, messagingConfig])
    }

    return results
  }

  async updateServiceCatalogueEnvironmentAwsMessagingConfig(
    environments: Environment[],
    components: Components,
    componentService: ComponentService,
  ): Promise<void> {
    const messagingConfigByEnvironment = await this.gatherMessagingConfig(environments)
    await componentService.updateEnvironmentAwsMessagingConfig(messagingConfigByEnvironment, components)
  }
}

export default MessagingConfigService
