import { EnvType, type Environment } from '../config'
import { AppInsightsService } from '../data/appInsights/appInsightsService'
import { type MessagingInfo, Components, type Component } from '../data/Components'
import EnvironmentService from '../data/serviceCatalogue/environmentService'
import { MessagingInfoService } from './messagingInfoUpdate'

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

const sampleMessagingInfo: MessagingInfo[] = [
  {
    componentName: 'component-a',
    inboundSqsQueues: ['inbound-a'],
    outboundSnsTopics: ['topic-a'],
    outboundSqsQueues: ['outbound-a'],
  },
]

let service: MessagingInfoService

describe('MessagingInfoService', () => {
  beforeEach(() => {
    service = new MessagingInfoService(environmentService, () => appinsightsService)
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

    appinsightsService.getMessagingInfo.mockResolvedValue(sampleMessagingInfo)

    await service.updateMessagingInfo([devEnvironment, preprodEnvironment], components)

    expect(environmentService.updateMessagingInfo.mock.calls[0][1]).toStrictEqual(components)
    expect(environmentService.updateMessagingInfo.mock.calls[0][0]).toStrictEqual([
      [
        'DEV',
        [
          {
            componentName: 'component-a',
            inboundSqsQueues: ['inbound-a'],
            outboundSnsTopics: ['topic-a'],
            outboundSqsQueues: ['outbound-a'],
          },
        ],
      ],
      [
        'PREPROD',
        [
          {
            componentName: 'component-a',
            inboundSqsQueues: ['inbound-a'],
            outboundSnsTopics: ['topic-a'],
            outboundSqsQueues: ['outbound-a'],
          },
        ],
      ],
    ])
  })
})
