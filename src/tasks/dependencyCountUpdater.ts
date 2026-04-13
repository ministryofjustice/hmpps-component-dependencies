import { type ComponentInfo, type DependencyInfo } from './dependencyInfoGatherer'
import logger from '../utils/logger'
import { Components, type Component } from '../data/Components'
import { EnvType } from '../config'
import ComponentService from '../data/serviceCatalogue/componentService'

export type ComponentDependentDetails = {
  documentId?: string
  componentName: string
  dependentCount: number
}

export class DependencyCountService {
  constructor(private readonly componentService: ComponentService) {}

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
      } else if (matchingComponent.dependentCount === dependentCount) {
        logger.info(`Ignoring component ${componentName} as counts match.`)
      } else if (matchingComponent?.dependentCount !== dependentCount) {
        logger.info(
          `Updating component ${componentName} dependent_count (current: ${matchingComponent.dependentCount}, new: ${dependentCount})`,
        )
        dependencyCounts.push({ documentId, componentName, dependentCount })
      }
    }
    return dependencyCounts
  }

  async updateComponentDependentCount(
    componentDependencies: Record<EnvType, DependencyInfo>,
    components: Components,
  ): Promise<void> {
    const validComponents = Array.isArray(components.components) ? components.components : ([] as Component[])
    const prodDependencyInfo = componentDependencies.PROD

    if (!prodDependencyInfo) {
      logger.warn('No PROD environment found in componentDependencies.')
      return
    }

    const prodDependencies = prodDependencyInfo.componentDependencyInfo

    // Use the updated dependencyCountCalculator to get dependency counts along with documentId
    const dependencyCounts = this.getDependencyCounts(prodDependencies, validComponents)

    // Loop through the returned data and call putComponent
    for (const { componentName, dependentCount, documentId } of dependencyCounts) {
      logger.info(`Updating dependency count of component: ${componentName}`)

      // eslint-disable-next-line no-await-in-loop -- Intentionally sequential to keep update flow predictable and logs ordered.
      await this.componentService.putComponent(documentId, dependentCount)
      logger.info(`Updated dependency count of component ${componentName} to ${dependentCount}`)
    }
  }
}

export default DependencyCountService
