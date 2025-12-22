import { Client } from './Client'
import { Components } from '../Components'

class ComponentService {
  const client = new Client()
  const getComponents = async () => {
    const components = await this.client.getComponents()
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

  const postComponent = async (documentId: string, dependent_count: number) => {
    try {
      const response = await this.client.postComponent({ documentId, dependent_count })
      console.log(`Component with documentId ${documentId} successfully updated with dependent_count: ${dependent_count}`)
      return response
    } catch (error) {
      console.error(`Failed to update component with documentId ${documentId}:`, error)
      throw error
    }
  }
}


export default ComponentService
