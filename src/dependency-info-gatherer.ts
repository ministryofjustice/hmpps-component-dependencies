import type { Dependency, Components } from './data/ComponentInfo'

type DependencyReference = { name: string; type: string }
type DependencyInfo = {
  dependencies: {
    components: string[]
    resources: string[]
    other: DependencyReference[]
  }
  dependents: string[]
}

const buildUnknownDependencies = (components: Components) => {
  const seen: Record<string, Dependency> = {}
  Object.values(components)
    .flatMap(s => s.unknownDependencies)
    .forEach(i => {
      seen[`${i[1]}$${i[2]}`] = i
    })
  return Object.values(seen)
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([, target, type]) => ({ target, type }))
}

const buildCategoryToComponent = (components: Components): Record<string, string[]> => {
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

const buildComponentInfo = (componentsMap: Components): Record<string, DependencyInfo> => {
  return Object.entries(componentsMap).reduce(
    (acc, [componentName, component]) => {
      const components = Object.keys(component.knownDependencies).map(name => name)
      const other = component.unknownDependencies.map(([, target, type]) => ({
        name: target,
        type,
      }))
      const resources = component.dependencyCategories.map(name => name)
      const dependents = component.reliedUponBy.map(({ name }) => name)

      acc[componentName] = { dependencies: { components, resources, other }, dependents }
      return acc
    },
    {} as Record<string, DependencyInfo>,
  )
}

const gatherDependencyInfo = async (components: Components) => {
  const categoryToComponent = buildCategoryToComponent(components)
  const unknownDependencies = buildUnknownDependencies(components)
  const componentDependencyInfo = buildComponentInfo(components)

  return {
    categoryToComponent,
    unknownDependencies,
    componentDependencyInfo,
  }
}

export default gatherDependencyInfo
