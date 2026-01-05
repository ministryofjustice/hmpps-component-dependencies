import { type ComponentInfo } from './dependency-info-gatherer'
import logger from './utils/logger'
import { type Components, Component } from './data/Components'
import { EnvType } from './config'
import ComponentService from './data/serviceCatalogue'
import { type DependencyInfo } from './dependency-info-gatherer'

export type ComponentDependentDetails = {
  documentId?: string
  componentName: string
  dependentCount: number
}

export class DependencyCountService {
  getDependencyCounts(
    componentDependencies: Record<string, ComponentInfo>,
    validComponents: Component[],
  ): ComponentDependentDetails[] {
    const dependencyCounts: ComponentDependentDetails[] = []

    for (const [componentName, componentInfo] of Object.entries(componentDependencies)) {
      const dependents = componentInfo.dependents || [] // Ensure dependents is always an array
      const dependentCount = dependents.length

      // Find the matching component in validComponents to get the documentId
      const matchingComponent = validComponents.find(component => component.name === componentName)
      const documentId = matchingComponent?.documentId
      if (!documentId) {
        logger.warn(`Component ${componentName} not found in service catalogue.`)
      } else if (matchingComponent?.dependentCount !== dependentCount) {
        dependencyCounts.push({ documentId, componentName, dependentCount })
      } else if (matchingComponent.dependentCount === null) {
        logger.info(`Component ${componentName} has null dependent count, updating to ${dependentCount}.`)
        dependencyCounts.push({ documentId, componentName, dependentCount })
      } else if (matchingComponent.dependentCount === dependentCount) {
        logger.info(`Ignoring component ${componentName} as counts match.`)
      }
    }
    return dependencyCounts
  }

  async updateServiceCatalogueComponentDependentCount(
    componentDependencies: [EnvType, DependencyInfo][],
    components: Components,
    componentService: ComponentService,
  ): Promise<void> {
    const validComponents = Array.isArray(components.components) ? components.components : ([] as Component[])
    const prodDependencyTuple = componentDependencies.find(([env]) => env === 'PROD')

    if (!prodDependencyTuple) {
      logger.info('No PROD environment found in componentDependencies.')
      return
    }

    const [, prodDependencyInfo] = prodDependencyTuple
    const prodDependencies = prodDependencyInfo.componentDependencyInfo

    // Use the updated dependencyCountCalculator to get dependency counts along with documentId
    const dependencyCounts = this.getDependencyCounts(prodDependencies, validComponents)

    // Loop through the returned data and call putComponent
    for (const { componentName, dependentCount, documentId } of dependencyCounts) {
      logger.info(`Updating dependency count of component: ${componentName}`)
      await componentService.putComponent(documentId, dependentCount)
      logger.info(`Updated dependency count of component ${componentName} to ${dependentCount}`)
    }
  }
}

export default DependencyCountService
