import { EnvType } from '../../config'
import logger from '../../utils/logger'
import { Components, type Component, type MessagingConfig } from '../Components'
import { Client } from './Client'
import EnvironmentService from './environmentService'

jest.mock('./Client')

describe('ComponentService.updateEnvironmentAwsMessagingConfig', () => {
  let service: EnvironmentService
  let client: jest.Mocked<Client>

  beforeEach(() => {
    client = new Client() as jest.Mocked<Client>
    service = new EnvironmentService(client)

    jest.spyOn(logger, 'info').mockImplementation(() => {})
    jest.spyOn(logger, 'warn').mockImplementation(() => {})
    jest.spyOn(logger, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('updates messaging config when component and environment are found', async () => {
    const component: Component = {
      name: 'component-a',
      cloudRoleName: 'cloud-role-a',
      dependentCount: 0,
      envs: [
        {
          documentId: 'env-doc-1',
          name: 'dev',
          hostname: 'component-a.hmpps.service.justice.gov.uk',
          clusterHostname: 'component-a.dev.svc.cluster.local',
        },
      ],
    }

    const components = new Components([component])
    const messagingConfigByEnvironment: [EnvType, MessagingConfig[]][] = [
      [
        EnvType.DEV,
        [
          {
            componentName: 'cloud-role-a',
            inbound_sqs_queues: ['inbound-1'],
            outbound_sns_topics: ['topic-1'],
            outbound_sqs_queues: ['outbound-1'],
          },
        ],
      ],
    ]

    await service.updateMessagingConfig(messagingConfigByEnvironment, components)

    expect(client.putEnvironmentAwsMessagingConfig).toHaveBeenCalledWith({
      environmentDocumentId: 'env-doc-1',
      messagingConfig: {
        componentName: 'cloud-role-a',
        inbound_sqs_queues: ['inbound-1'],
        outbound_sns_topics: ['topic-1'],
        outbound_sqs_queues: ['outbound-1'],
      },
    })
  })

  test('logs warning when component is not found', async () => {
    const components = new Components([])
    const messagingConfigByEnvironment: [EnvType, MessagingConfig[]][] = [
      [
        EnvType.DEV,
        [
          {
            componentName: 'missing-component',
            inbound_sqs_queues: ['inbound-1'],
            outbound_sns_topics: ['topic-1'],
            outbound_sqs_queues: ['outbound-1'],
          },
        ],
      ],
    ]

    await service.updateMessagingConfig(messagingConfigByEnvironment, components)

    expect(logger.warn).toHaveBeenCalledWith('Component missing-component not found in service catalogue.')
    expect(client.putEnvironmentAwsMessagingConfig).not.toHaveBeenCalled()
  })

  test('logs warning when target environment is not found for component', async () => {
    const component: Component = {
      name: 'component-a',
      cloudRoleName: 'cloud-role-a',
      dependentCount: 0,
      envs: [
        {
          documentId: 'env-doc-prod',
          name: 'prod',
          hostname: 'component-a.hmpps.service.justice.gov.uk',
          clusterHostname: 'component-a.prod.svc.cluster.local',
        },
      ],
    }

    const components = new Components([component])
    const messagingConfigByEnvironment: [EnvType, MessagingConfig[]][] = [
      [
        EnvType.DEV,
        [
          {
            componentName: 'cloud-role-a',
            inbound_sqs_queues: ['inbound-1'],
            outbound_sns_topics: ['topic-1'],
            outbound_sqs_queues: ['outbound-1'],
          },
        ],
      ],
    ]

    await service.updateMessagingConfig(messagingConfigByEnvironment, components)

    expect(logger.warn).toHaveBeenCalledWith(
      'Environment dev not found for component component-a in service catalogue.',
    )
    expect(client.putEnvironmentAwsMessagingConfig).not.toHaveBeenCalled()
  })

  test('logs contextual error and rethrows when putEnvironmentAwsMessagingConfig fails', async () => {
    const error = new Error('request failed')
    client.putEnvironmentAwsMessagingConfig.mockRejectedValue(error)

    const component: Component = {
      name: 'component-a',
      cloudRoleName: 'cloud-role-a',
      dependentCount: 0,
      envs: [
        {
          documentId: 'env-doc-1',
          name: 'dev',
          hostname: 'component-a.hmpps.service.justice.gov.uk',
          clusterHostname: 'component-a.dev.svc.cluster.local',
        },
      ],
    }

    const components = new Components([component])
    const messagingConfigByEnvironment: [EnvType, MessagingConfig[]][] = [
      [
        EnvType.DEV,
        [
          {
            componentName: 'cloud-role-a',
            inbound_sqs_queues: ['inbound-1'],
            outbound_sns_topics: ['topic-1'],
            outbound_sqs_queues: ['outbound-1'],
          },
        ],
      ],
    ]

    await expect(service.updateMessagingConfig(messagingConfigByEnvironment, components)).rejects.toThrow(
      'request failed',
    )

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to update messaging config for component cloud-role-a in environment dev (environmentDocumentId: env-doc-1)',
      error,
    )
  })
})
