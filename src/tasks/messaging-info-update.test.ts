import { EnvType, type Environment } from '../config'
import { AppInsightsService } from '../data/appInsights/appInsightsService'
import { type MessagingConfig, Components, type Component } from '../data/Components'
import EnvironmentService from '../data/serviceCatalogue/environmentService'
import { MessagingConfigService } from './messaging-info-update'

const environmentService: jest.Mocked<EnvironmentService> = new EnvironmentService(
  null,
) as jest.Mocked<EnvironmentService>
const appinsightsService: jest.Mocked<AppInsightsService> = new AppInsightsService(
  null,
) as jest.Mocked<AppInsightsService>

jest.mock('../data/appInsights/appInsightsService')
jest.mock('../data/serviceCatalogue/environmentService')

const devEnvironment: Environment = {
  env: EnvType.DEV,
  appInsightsCreds: { appId: 'dev-app-id', appKey: 'dev-app-key' },
}

const preprodEnvironment: Environment = {
  env: EnvType.PREPROD,
  appInsightsCreds: { appId: 'preprod-app-id', appKey: 'preprod-app-key' },
}

const sampleMessagingConfig: MessagingConfig[] = [
  {
    componentName: 'component-a',
    inbound_sqs_queues: ['inbound-a'],
    outbound_sns_topics: ['topic-a'],
    outbound_sqs_queues: ['outbound-a'],
  },
]

let service: MessagingConfigService

describe('MessagingConfigService', () => {
  beforeEach(() => {
    service = new MessagingConfigService(environmentService, () => appinsightsService)
  })

  test('gathers config and updates service catalogue environments', async () => {
    const component: Component = {
      name: 'component-a',
      cloudRoleName: 'component-a',
      dependentCount: 0,
      envs: [
        {
          documentId: 'documentidcomp1env1',
          name: 'dev',
          hostname: 'http://component-a',
          clusterHostname: 'component-a.dev.svc.cluster.local',
        },
        {
          documentId: 'documentidcomp1env2',
          name: 'preprod',
          hostname: 'http://component-a',
          clusterHostname: 'component-a.preprod.svc.cluster.local',
        },
      ],
    }
    const components = new Components([component])

    appinsightsService.getMessagingConfig.mockResolvedValue(sampleMessagingConfig)

    await service.updateMessagingConfig([devEnvironment, preprodEnvironment], components)

    expect(environmentService.updateMessagingConfig.mock.calls[0][1]).toStrictEqual(components)
    expect(environmentService.updateMessagingConfig.mock.calls[0][0]).toStrictEqual([
      [
        'DEV',
        [
          {
            componentName: 'component-a',
            inbound_sqs_queues: ['inbound-a'],
            outbound_sns_topics: ['topic-a'],
            outbound_sqs_queues: ['outbound-a'],
          },
        ],
      ],
      [
        'PREPROD',
        [
          {
            componentName: 'component-a',
            inbound_sqs_queues: ['inbound-a'],
            outbound_sns_topics: ['topic-a'],
            outbound_sqs_queues: ['outbound-a'],
          },
        ],
      ],
    ])
  })
})
