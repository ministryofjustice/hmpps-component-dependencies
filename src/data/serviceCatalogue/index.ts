import ServiceCatalogueClient from './Client'
import { Components } from '../Components'

const getComponents = async (serviceCatalogHostName: string) => {
  const client = new ServiceCatalogueClient(serviceCatalogHostName)
  const components = await client.getComponents()
  const filteredComponents = components
    .filter(component => component.environments?.length)
    .map(entry => ({
      name: entry.name,
      cloudRoleName: entry.cloudRoleName,
      environments: entry.environments
        .filter(env => env.url)
        .map(env => ({
          name: env.name,
          url: env.url.replace('https://', ''),
        })),
    }))
  return new Components(filteredComponents)
}

export default getComponents
