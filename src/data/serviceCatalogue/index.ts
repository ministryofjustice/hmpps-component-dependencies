import { Client } from './Client'
import { Components } from '../Components'

class ComponentService {
  private client: Client

  constructor() {
    this.client = new Client()
  }
  async getComponents(): Promise<Components> {
    const components = await this.client.getComponents()
    const filteredComponents = components
      .filter(component => component.envs?.length)
      .map(entry => ({
        documentId: entry.documentId,
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

  async putComponent(documentId: string, dependent_count: number){
    console.log(`in index.ts putComponent with documentId: ${documentId} and dependent_count: ${dependent_count}`)
    try {
      const response = await this.client.putComponent({ documentId, dependent_count })
      console.log(`Component with documentId ${documentId} successfully updated with dependent_count: ${dependent_count}`)
      return response
    } catch (error) {
      console.error(`Failed to update component with documentId ${documentId}:`, error)
      throw error
    }
  }
}


export default ComponentService
