import { EnvType } from '../../config'
import logger from '../../utils/logger'
import { Components, type Component, type MessagingInfo } from '../Components'
import { Client } from './Client'
import EnvironmentService from './environmentService'

jest.mock('./Client')

describe('ComponentService.updateEnvironmentAwsMessagingInfo', () => {
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
    const messagingInfoByEnvironment: [EnvType, MessagingInfo[]][] = [
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

    await service.updateMessagingInfo(messagingInfoByEnvironment, components)

    expect(client.putEnvironmentAwsMessagingInfo).toHaveBeenCalledWith({
      environmentDocumentId: 'env-doc-1',
      MessagingInfo: {
        componentName: 'cloud-role-a',
        inbound_sqs_queues: ['inbound-1'],
        outbound_sns_topics: ['topic-1'],
        outbound_sqs_queues: ['outbound-1'],
      },
    })
  })

  test('logs warning when component is not found', async () => {
    const components = new Components([])
    const messagingInfoByEnvironment: [EnvType, MessagingInfo[]][] = [
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

    await service.updateMessagingInfo(messagingInfoByEnvironment, components)

    expect(logger.warn).toHaveBeenCalledWith('Component missing-component not found in service catalogue.')
    expect(client.putEnvironmentAwsMessagingInfo).not.toHaveBeenCalled()
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
    const messagingInfoByEnvironment: [EnvType, MessagingInfo[]][] = [
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

    await service.updateMessagingInfo(messagingInfoByEnvironment, components)

    expect(logger.warn).toHaveBeenCalledWith(
      'Environment dev not found for component component-a in service catalogue.',
    )
    expect(client.putEnvironmentAwsMessagingInfo).not.toHaveBeenCalled()
  })

  test('logs contextual error and rethrows when putEnvironmentAwsMessagingInfo fails', async () => {
    const error = new Error('request failed')
    client.putEnvironmentAwsMessagingInfo.mockRejectedValue(error)

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
    const messagingInfoByEnvironment: [EnvType, MessagingInfo[]][] = [
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

    await expect(service.updateMessagingInfo(messagingInfoByEnvironment, components)).rejects.toThrow('request failed')

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to update messaging config for component cloud-role-a in environment dev (environmentDocumentId: env-doc-1)',
      error,
    )
  })
})
