import type { Client } from './Client'
import { Component, Components, type MessagingInfo } from '../Components'
import logger from '../../utils/logger'
import { type EnvType } from '../../config'

class EnvironmentService {
  constructor(private readonly client: Client) {}

  async updateMessagingInfo(MessagingInfoByEnvironment: [EnvType, MessagingInfo[]][], components: Components) {
    const componentByName = new Map<string, (typeof components.components)[number]>()
    components.components.forEach(component => {
      componentByName.set(component.cloudRoleName, component)
      componentByName.set(component.name, component)
    })

    for (const [environment, MessagingInfos] of MessagingInfoByEnvironment) {
      const targetEnvironment = environment.toLowerCase()

      for (const config of MessagingInfos) {
        await this.updateMessagingInfoForEnvironment(targetEnvironment, componentByName, config)
      }
    }
  }

  private async updateMessagingInfoForEnvironment(
    environment: string,
    componentByName: Map<string, Component>,
    update: MessagingInfo,
  ) {
    logger.info(`Updating messaging config for component ${update.componentName} in environment ${environment}`)
    const matchingComponent = componentByName.get(update.componentName)

    if (!matchingComponent) {
      logger.warn(`Component ${update.componentName} not found in service catalogue.`)
      return
    }

    const environmentDocumentId = matchingComponent.envs.find(env => env.name.toLowerCase() === environment)?.documentId

    if (!environmentDocumentId) {
      logger.warn(`Environment ${environment} not found for component ${matchingComponent.name} in service catalogue.`)
      return
    }

    try {
      await this.client.putEnvironmentAwsMessagingInfo({ environmentDocumentId, MessagingInfo: update })
    } catch (error) {
      logger.error(
        `Failed to update messaging config for component ${update.componentName} in environment ${environment} (environmentDocumentId: ${environmentDocumentId})`,
        error,
      )
      throw error
    }

    logger.info(`Updated messaging config for component ${update.componentName} (${environment}) in service catalogue.`)
  }
}

export default EnvironmentService
