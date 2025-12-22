import ComponentNode from '../component-node'

export type Component = {
  documentId?: string
  name: string
  cloudRoleName: string
  envs: { name: string; hostname: string; clusterHostname: string }[]
}

// A relationship between a component and something else
export type Dependency = { componentName: string; dependencyHostname: string; type: string }

export type ComponentMap = Record<string, ComponentNode>

export class Components {
  private readonly componentLookup: Record<string, Component>

  constructor(readonly components: Component[]) {
    this.componentLookup = Object.fromEntries(
      components.flatMap((component: Component) => {
        const { envs } = component
        return envs
          .flatMap(env => [
            [env.hostname, component],
            [env.clusterHostname, component],
          ])
          .concat([[component.cloudRoleName, component]])
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

    const cloudRoleNameLookup = this.components.reduce(
      (acc, component) => {
        acc[component.cloudRoleName] = component.name
        return acc
      },
      {} as Record<string, string>,
    )

    const lookUpComponentName = (name: string) => cloudRoleNameLookup[name] || name

    dependencies.forEach(dependency => {
      const { componentName: cloudRoleName, dependencyHostname } = dependency
      const componentName = lookUpComponentName(cloudRoleName)

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
