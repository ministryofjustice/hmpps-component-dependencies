import superagent from 'superagent'

export type ServiceCatalogueComponent = {
  name: string
  app_insights_cloud_role_name: string
  environments: { name: string; url: string; namespace: string }[]
}

type App = { attributes: ServiceCatalogueComponent }

export default class ServiceCatalogue {
  constructor(private readonly hostName: string) {}

  async getComponents(): Promise<ServiceCatalogueComponent[]> {
    return superagent
      .get(`${this.hostName}/v1/components?populate=environments`)
      .set('Accept', 'application/json')
      .then(res => res.body.data.map((app: App) => app.attributes))
  }
}
