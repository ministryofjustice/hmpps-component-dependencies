import { asSystem, RestClient } from '@ministryofjustice/hmpps-rest-client'
import logger from '../../utils/logger'
import config from '../../config'
import { type MessagingInfo } from '../Components'

export type ServiceCatalogueComponent = {
  documentId: string
  name: string
  app_insights_cloud_role_name: string
  envs?: { documentId?: string; name: string; url: string; namespace: string }[]
  dependent_count?: number
}

type ServiceCatalogueResponse = { data: ServiceCatalogueComponent[] }

export class Client extends RestClient {
  constructor() {
    super('service-catalogue', config.serviceCatalogue, logger, { getToken: async () => config.serviceCatalogue.token })
  }

  async getComponents() {
    const response = await this.get<ServiceCatalogueResponse>(
      { path: '/v1/components?populate[envs]=true' },
      asSystem(),
    )
    return response.data
  }

  async putComponent({ documentId, dependentCount }: { documentId: string; dependentCount: number }) {
    const payload = { data: { dependent_count: dependentCount } }
    const response = await this.put<ServiceCatalogueResponse>(
      {
        path: `/v1/components/${documentId}`,
        data: payload,
      },
      asSystem(),
    )
    return response.data
  }

  async putEnvironmentAwsMessagingInfo({
    environmentDocumentId,
    MessagingInfo,
  }: {
    environmentDocumentId: string
    MessagingInfo: Omit<MessagingInfo, 'componentName'>
  }) {
    const payload = {
      data: {
        aws_messaging_config: {
          inbound_sqs_queues: MessagingInfo.inbound_sqs_queues,
          outbound_sns_topics: MessagingInfo.outbound_sns_topics,
          outbound_sqs_queues: MessagingInfo.outbound_sqs_queues,
        },
      },
    }
    const response = await this.put<{ data: unknown }>(
      {
        path: `/v1/environments/${environmentDocumentId}`,
        data: payload,
      },
      asSystem(),
    )
    return response.data
  }
}
