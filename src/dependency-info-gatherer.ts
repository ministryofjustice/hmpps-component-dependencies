import type { Dependency, Components } from './data/ComponentInfo'
import logger from './utils/logger'

type DependencyReference = { name: string; type: string }
type DependencyInfo = {
  dependencies: {
    components: string[]
    resources: string[]
    other: DependencyReference[]
  }
  dependents: string[]
}

const buildMissingComponents = (components: Components) => {
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
      const other = component.unknownDependencies.map(({ dependencyHostname, type }) => ({
        name: dependencyHostname,
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
  const missingComponents = buildMissingComponents(components)
  const componentDependencyInfo = buildComponentInfo(components)

  const missingServices = missingComponents.map(c => c.dependencyHostname).sort()
  logger.info(`Services missing from service catalogue: \n\t${missingServices.join('\n\t')}`)

  return {
    categoryToComponent,
    componentDependencyInfo,
  }
}

export default gatherDependencyInfo
