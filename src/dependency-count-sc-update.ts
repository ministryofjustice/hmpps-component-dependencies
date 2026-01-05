import { type ComponentInfo } from './dependency-info-gatherer'
import logger from './utils/logger'
import { type Components, Component } from './data/Components'
import { EnvType } from './config'
import ComponentService from './data/serviceCatalogue'
import { type DependencyInfo } from './dependency-info-gatherer'

export type DependentCount = [componentName: string, count: number]

export class DependencyCountService {
  getDependencyCounts(
    componentDependencies: Record<string, ComponentInfo>,
    validComponents: Component[],
  ): Array<{ componentName: string; dependentCount: number; documentId?: string }> {
    const dependencyCounts: Array<{ componentName: string; dependentCount: number; documentId?: string }> = []

    for (const [componentName, componentInfo] of Object.entries(componentDependencies)) {
      const dependents = componentInfo.dependents || [] // Ensure dependents is always an array
      const dependentCount = dependents.length

      // Find the matching component in validComponents to get the documentId
      const matchingComponent = validComponents.find(component => component.name === componentName)
      const documentId = matchingComponent?.documentId
      if (documentId) {
        dependencyCounts.push({ documentId, componentName, dependentCount })
      }
      else {
        logger.warn(`Component ${componentName} not found in service catalogue.`)
      }
    }
    return dependencyCounts
  }

  updateServiceCatalogueComponentDependentCount(
    componentDependencies: [EnvType, DependencyInfo][],
    components: Components,
    componentService: ComponentService,
  ): Promise<void> {
    const validComponents = Array.isArray(components.components) ? components.components : ([] as Component[])
    const prodDependencyTuple = componentDependencies.find(([env]) => env === 'PROD')

    if (!prodDependencyTuple) {
      logger.warn('No PROD environment found in componentDependencies.')
      return
    }

    const [, prodDependencyInfo] = prodDependencyTuple
    const prodDependencies = prodDependencyInfo.componentDependencyInfo

    // Use the updated dependencyCountCalculator to get dependency counts along with documentId
    const dependencyCounts = this.getDependencyCounts(prodDependencies, validComponents)

    // Loop through the returned data and call putComponent
    for (const { componentName, dependentCount, documentId } of dependencyCounts) {
      logger.info(`Processing component: ${componentName}`)
      componentService.putComponent(documentId, dependentCount)
      logger.info(`Updated dependency count of component ${componentName} to ${dependentCount}`)
    }
  }
}

export default DependencyCountService
