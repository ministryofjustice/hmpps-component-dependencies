import { Client } from './Client'
import { Components } from '../Components'

const getComponents = async () => {
  const client = new Client()
  const components = await client.getComponents()
  const filteredComponents = components
    .filter(component => component.envs?.length)
    .map(entry => ({
      name: entry.name,
      cloudRoleName: entry.app_insights_cloud_role_name,
      envs: entry.envs
        .filter(env => env.url)
        .map(env => ({
          name: env.name,
          hostname: env.url.replace('https://', ''),
          clusterHostname: `${entry.name}.${env.namespace}.svc.cluster.local`,
        })),
    }))

  return new Components(filteredComponents)
}

export default getComponents
