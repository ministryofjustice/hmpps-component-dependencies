import { type ComponentInfo } from './dependency-info-gatherer'

export type DependentCount = [componentName: string, count: number]

export const dependencyCountCalculator = {
  getDependencyCounts: (componentDependencies: Record<string, ComponentInfo>): Array<DependentCount> => {
    const dependencyCounts: Array<DependentCount> = []

    for (const [componentName, componentInfo] of Object.entries(componentDependencies)) {
      const dependents = componentInfo.dependents || [] // Ensure dependents is always an array
      const dependentCount = dependents.length
      dependencyCounts.push([componentName, dependentCount])
    }

    return dependencyCounts
  },
}
