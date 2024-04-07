import ComponentNode from '../component-node'

export type Component = {
  name: string
  cloudRoleName: string
  environments: { name: string; url: string }[]
}

// A relationship between a component and something else
export type Dependency = { componentName: string; dependencyHostname: string; type: string }

export type ComponentMap = Record<string, ComponentNode>

export class Components {
  private readonly componentLookup: Record<string, Component>

  constructor(readonly components: Component[]) {
    this.componentLookup = Object.fromEntries(
      components.flatMap((component: Component) => {
        const { environments } = component
        return environments.map(env => [env.url, component])
      }),
    )
  }

  getComponentForHostname(hostName: string): Component {
    return this.componentLookup[hostName]
  }

  buildComponentMap(dependencies: Dependency[]): ComponentMap {
    const componentMap = this.components.reduce((acc, component) => {
      acc[component.name] = new ComponentNode(component.name, component)
      return acc
    }, {} as ComponentMap)

    dependencies.forEach(dependency => {
      const { componentName, dependencyHostname } = dependency
      const componentNode = componentMap[componentName] || new ComponentNode(componentName, undefined)
      const dependentComponent = this.getComponentForHostname(dependencyHostname)
      if (dependentComponent) {
        componentNode.addComponentDependency(dependentComponent.name)
      } else if (dependencyHostname) {
        componentNode.addUnknownDependency(dependency)
      }
      componentMap[componentName] = componentNode
    })

    /** Go through map and resolve each dependency by linking to other component nodes */
    Object.values(componentMap).forEach(component => {
      Object.keys(component.knownDependencies).forEach(dependencyName => {
        component.resolveDependency(dependencyName, componentMap[dependencyName])
      })
    })
    return componentMap
  }
}