import type { Dependency, ComponentMap } from './data/Components'

type DependencyReference = { name: string; type: string }
type Dependent = { name: string; isKnownComponent: boolean }
type ComponentInfo = {
  dependencies: {
    components: string[]
    categories: string[]
    other: DependencyReference[]
  }
  dependents: Dependent[]
}

export type DependencyInfo = {
  categoryToComponent: Record<string, string[]>
  componentDependencyInfo: Record<string, ComponentInfo>
  missingServices: string[]
}

const buildMissingComponents = (components: ComponentMap) => {
  const seen: Record<string, Dependency> = {}
  Object.values(components)
    .flatMap(s => s.unknownDependencies)
    .forEach(i => {
      seen[`${i.dependencyHostname}$${i.type}`] = i
    })
  return Object.values(seen)
    .sort((a, b) => a.dependencyHostname.localeCompare(b.dependencyHostname))
    .map(({ dependencyHostname, type }) => ({ dependencyHostname, type }))
    .filter(dependency => dependency.dependencyHostname.includes('service.justice.gov.uk'))
}

const buildCategoryToComponent = (components: ComponentMap): Record<string, string[]> => {
  return Object.values(components).reduce(
    (acc, component) => {
      component.dependencyCategories.forEach(category => {
        const nodes = acc[category] || []
        nodes.push(component.name)
        acc[category] = nodes
      })
      return acc
    },
    {} as Record<string, string[]>,
  )
}

const buildComponentInfo = (componentMap: ComponentMap): Record<string, ComponentInfo> => {
  return Object.entries(componentMap).reduce(
    (acc, [componentName, node]) => {
      const components = Object.keys(node.knownDependencies).map(name => name)
      const other = node.unknownDependencies.map(({ dependencyHostname, type }) => ({
        name: dependencyHostname,
        type,
      }))
      const categories = node.dependencyCategories.map(name => name)
      const dependents = Object.values(node.reliedUponBy).map(({ name, component }) => ({
        name,
        isKnownComponent: Boolean(component),
      }))

      acc[componentName] = { dependencies: { components, categories, other }, dependents }
      return acc
    },
    {} as Record<string, ComponentInfo>,
  )
}

const gatherDependencyInfo = (components: ComponentMap): DependencyInfo => {
  const categoryToComponent = buildCategoryToComponent(components)
  const missingComponents = buildMissingComponents(components)
  const componentDependencyInfo = buildComponentInfo(components)

  const missingServices = missingComponents.map(c => c.dependencyHostname).sort()

  return {
    categoryToComponent,
    componentDependencyInfo,
    missingServices,
  }
}

export default gatherDependencyInfo
