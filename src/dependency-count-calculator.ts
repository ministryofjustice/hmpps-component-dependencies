import { type ComponentInfo } from './dependency-info-gatherer'
import { type Component } from './data/Components'

export type DependentCount = [componentName: string, count: number]

export const dependencyCountCalculator = {
  getDependencyCounts: (
    componentDependencies: Record<string, ComponentInfo>,
    validComponents: Component[],
  ): Array<{ componentName: string; dependentCount: number; documentId?: string }> => {
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
    }
    return dependencyCounts
  },
}
