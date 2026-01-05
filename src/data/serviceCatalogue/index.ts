import { Client } from './Client'
import { Components } from '../Components'
import logger from '../../utils/logger'

class ComponentService {
  private client: Client

  constructor() {
    this.client = new Client()
  }

  async getComponents(): Promise<Components> {
    const components = await this.client.getComponents()
    const filteredComponents = components
      .filter(entry => entry.app_insights_cloud_role_name)
      .map(entry => ({
        documentId: entry.documentId,
        name: entry.name,
        cloudRoleName: entry.app_insights_cloud_role_name,
        dependentCount: entry.dependent_count,
        envs: entry.envs?.length
          ? entry.envs
              .filter(env => env.url)
              .map(env => ({
                name: env.name,
                hostname: env.url.replace('https://', ''),
                clusterHostname: `${entry.name}.${env.namespace}.svc.cluster.local`,
              }))
          : [],
      }))

    return new Components(filteredComponents)
  }

  async putComponent(documentId: string, dependentCount: number) {
    try {
      const response = await this.client.putComponent({ documentId, dependentCount })
      return response
    } catch (error) {
      logger.error(`Failed to update component with documentId ${documentId}:`, error)
      throw error
    }
  }
}

export default ComponentService
