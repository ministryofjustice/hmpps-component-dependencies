import { asSystem, RestClient } from '@ministryofjustice/hmpps-rest-client'
import logger from '../../utils/logger'
import config from '../../config'

export type ServiceCatalogueComponent = {
  documentId: string
  name: string
  app_insights_cloud_role_name: string
  envs?: { name: string; url: string; namespace: string }[]
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

  async postComponent({ documentId, dependent_count }: { documentId: string; dependent_count: number }) {
    const response = await this.post<ServiceCatalogueResponse>({
      path: `/v1/components/${documentId}`,
      data: { dependent_count: dependent_count },
    }, asSystem())
    return response.data
  }
}
