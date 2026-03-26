import { EnvType } from '../../config'
import { Components, type Component, type MessagingConfig } from '../Components'
import logger from '../../utils/logger'
import ComponentService from './index'

describe('ComponentService.updateEnvironmentAwsMessagingConfig', () => {
  let service: ComponentService
  let mockPutEnvironmentAwsMessagingConfig: jest.Mock

  beforeEach(() => {
    service = new ComponentService()
    mockPutEnvironmentAwsMessagingConfig = jest.fn().mockResolvedValue({})
    ;(service as unknown as { client: { putEnvironmentAwsMessagingConfig: jest.Mock } }).client = {
      putEnvironmentAwsMessagingConfig: mockPutEnvironmentAwsMessagingConfig,
    }

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

    await service.updateEnvironmentAwsMessagingConfig(messagingConfigByEnvironment, components)

    expect(mockPutEnvironmentAwsMessagingConfig).toHaveBeenCalledWith({
      environmentDocumentId: 'env-doc-1',
      messagingConfig: {
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

    await service.updateEnvironmentAwsMessagingConfig(messagingConfigByEnvironment, components)

    expect(logger.warn).toHaveBeenCalledWith('Component missing-component not found in service catalogue.')
    expect(mockPutEnvironmentAwsMessagingConfig).not.toHaveBeenCalled()
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

    await service.updateEnvironmentAwsMessagingConfig(messagingConfigByEnvironment, components)

    expect(logger.warn).toHaveBeenCalledWith(
      'Environment dev not found for component component-a in service catalogue.',
    )
    expect(mockPutEnvironmentAwsMessagingConfig).not.toHaveBeenCalled()
  })

  test('logs contextual error and rethrows when putEnvironmentAwsMessagingConfig fails', async () => {
    const error = new Error('request failed')
    mockPutEnvironmentAwsMessagingConfig.mockRejectedValue(error)

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

    await expect(service.updateEnvironmentAwsMessagingConfig(messagingConfigByEnvironment, components)).rejects.toThrow(
      'request failed',
    )

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to update aws_messaging_config for component cloud-role-a in environment dev (environmentDocumentId: env-doc-1)',
      error,
    )
  })
})
