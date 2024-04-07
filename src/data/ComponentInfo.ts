import ComponentNode from '../component-node'

// A component name to the hostname it relies on.
export type Dependency = { componentName: string; dependencyHostname: string; type: string }

export type Component = {
  name: string
  cloudRoleName: string
  environments: { name: string; url: string }[]
}

export type Components = Record<string, ComponentNode>

export class ComponentInfo {
  private readonly componentLookup: Record<string, Component>

  constructor(readonly components: Component[]) {
    this.componentLookup = Object.fromEntries(
      components.flatMap((component: Component) => {
        const { environments } = component
        return environments.map(env => [env.url, component])
      }),
    )
  }

  getKnownComponents(): Dependency[] {
    return this.components.map(check => ({ componentName: check.name, dependencyHostname: undefined, type: 'component' }))
  }

  getComponentForHostname(hostName: string): Component {
    return this.componentLookup[hostName]
  }

  getComponentMap(dependencies: Dependency[]): Components {
    const componentMap = dependencies.reduce(
      (acc, dependency) => {
        const { componentName, dependencyHostname } = dependency
        const component = acc[componentName] || new ComponentNode(componentName)
        const dependentComponent = this.getComponentForHostname(dependencyHostname)
        if (dependentComponent) {
          component.addDependency(dependentComponent.name)
        } else if (dependencyHostname) component.addUnknownDependency(dependency)
        acc[componentName] = component
        return acc
      },
      {} as Record<string, ComponentNode>,
    )

    /** Go through map and resolve each dependency by linking to other component nodes */
    Object.values(componentMap).forEach(component => {
      Object.keys(component.knownDependencies).forEach(dependency => {
        component.resolveDependency(dependency, componentMap[dependency])
      })
    })
    return componentMap
  }
}
