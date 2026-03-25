import { EnvType, type Environment } from './config'
import { type MessagingConfig, Components, type Component } from './data/Components'
import ComponentService from './data/serviceCatalogue'
import { MessagingConfigService } from './messaging-config-sc-update'

const devEnvironment: Environment = {
  env: EnvType.DEV,
  appInsightsCreds: { appId: 'dev-app-id', appKey: 'dev-app-key' },
}

const preprodEnvironment: Environment = {
  env: EnvType.PREPROD,
  appInsightsCreds: { appId: 'preprod-app-id', appKey: 'preprod-app-key' },
}

const prodEnvironment: Environment = {
  env: EnvType.PROD,
  appInsightsCreds: { appId: 'prod-app-id', appKey: 'prod-app-key' },
}

const sampleMessagingConfig: MessagingConfig[] = [
  {
    componentName: 'component-a',
    inbound_sqs_queues: ['inbound-a'],
    outbound_sns_topics: ['topic-a'],
    outbound_sqs_queues: ['outbound-a'],
  },
]

const messagingConfigData = async () => sampleMessagingConfig

describe('MessagingConfigService', () => {
  test('fetches messaging config for DEV and PREPROD but not PROD', async () => {
    const service = new MessagingConfigService(messagingConfigData)

    const result = await service.gatherMessagingConfig([devEnvironment, preprodEnvironment, prodEnvironment])

    expect(result).toStrictEqual([
      [EnvType.DEV, sampleMessagingConfig],
      [EnvType.PREPROD, sampleMessagingConfig],
    ])
  })

  test('skips PROD environment entirely', async () => {
    const service = new MessagingConfigService(messagingConfigData)

    const result = await service.gatherMessagingConfig([prodEnvironment])

    expect(result).toStrictEqual([])
  })

  test('returns empty array when no environments provided', async () => {
    const service = new MessagingConfigService(messagingConfigData)

    const result = await service.gatherMessagingConfig([])

    expect(result).toStrictEqual([])
  })

  test('processes environments sequentially by preserving call order', async () => {
    const callOrder: string[] = []
    const orderTrackingFetcher = async (creds: { appId: string; appKey: string }) => {
      callOrder.push(creds.appId)
      return sampleMessagingConfig
    }
    const service = new MessagingConfigService(orderTrackingFetcher)

    await service.gatherMessagingConfig([devEnvironment, preprodEnvironment])

    expect(callOrder).toStrictEqual(['dev-app-id', 'preprod-app-id'])
  })

  test('gathers config and updates service catalogue environments', async () => {
    const service = new MessagingConfigService(messagingConfigData)
    const updateCalls: unknown[] = []
    const componentService = {
      updateEnvironmentAwsMessagingConfig: async (...args: unknown[]) => {
        updateCalls.push(args)
      },
    } as ComponentService

    const component: Component = {
      name: 'component-a',
      cloudRoleName: 'component-a',
      dependentCount: 0,
      envs: [{ name: 'dev', hostname: 'http://component-a', clusterHostname: 'component-a.dev.svc.cluster.local' }],
    }
    const components = new Components([component])

    await service.updateServiceCatalogueEnvironmentAwsMessagingConfig(
      [devEnvironment, prodEnvironment],
      components,
      componentService,
    )

    expect(updateCalls).toStrictEqual([[[[EnvType.DEV, sampleMessagingConfig]], components]])
  })
})
