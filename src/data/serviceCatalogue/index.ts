import { Client } from './Client'
import { Components, type MessagingConfig } from '../Components'
import logger from '../../utils/logger'
import { type EnvType } from '../../config'

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
                documentId: env.documentId,
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

  async updateEnvironmentAwsMessagingConfig(
    messagingConfigByEnvironment: [EnvType, MessagingConfig[]][],
    components: Components,
  ) {
    for (const [environment, messagingConfigs] of messagingConfigByEnvironment) {
      const targetEnvironment = environment.toLowerCase()

      for (const config of messagingConfigs) {
        const matchingComponent = components.components.find(
          component => component.cloudRoleName === config.componentName || component.name === config.componentName,
        )

        if (matchingComponent) {
          const matchingEnvironment = matchingComponent.envs.find(env => env.name.toLowerCase() === targetEnvironment)
          const environmentDocumentId = matchingEnvironment?.documentId

          if (environmentDocumentId) {
            // eslint-disable-next-line no-await-in-loop
            await this.client.putEnvironmentAwsMessagingConfig({
              environmentDocumentId,
              messagingConfig: {
                inbound_queue: config.inbound_queue,
                topic_queue: config.topic_queue,
                outbound_queue: config.outbound_queue,
              },
            })

            logger.info(
              `Updated aws_messaging_config for ${matchingComponent.name} (${targetEnvironment}) in service catalogue.`,
            )
          } else {
            logger.warn(
              `Environment ${targetEnvironment} not found for component ${matchingComponent.name} in service catalogue.`,
            )
          }
        } else {
          logger.warn(`Component ${config.componentName} not found in service catalogue.`)
        }
      }
    }
  }
}

export default ComponentService
