import { asSystem, RestClient } from '@ministryofjustice/hmpps-rest-client'
import logger from '../../utils/logger'
import config from '../../config'

export type ServiceCatalogueComponent = {
  name: string
  app_insights_cloud_role_name: string
  envs: { name: string; url: string; namespace: string }[]
}

type App = { attributes: ServiceCatalogueComponent }

type ServiceCatalogueResponse = { data: App[] }

export class Client extends RestClient {
  constructor() {
    super('service-catalogue', config.serviceCatalogue, logger, { getToken: async () => config.serviceCatalogue.token })
  }

  async getComponents() {
    const response = await this.get<ServiceCatalogueResponse>(
      { path: '/v1/components?populate=environments' },
      asSystem(),
    )
    return response.data.map((app: App) => app.attributes)
  }
}
