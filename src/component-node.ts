import type { Component, Dependency } from './data/Components'
import categorise from './dependency-categoriser'

export default class ComponentNode {
  public unknownDependencies: Dependency[] = []

  public reliedUponBy: Record<string, ComponentNode> = {}

  public knownDependencies: Record<string, ComponentNode> = {}

  public dependencyCategories: string[] = []

  constructor(
    readonly name: string,
    readonly component: Component,
  ) {}

  public addUnknownDependency(dependency: Dependency) {
    const category = categorise(dependency)
    if (category) {
      if (!this.dependencyCategories.includes(category)) {
        this.dependencyCategories.push(category)
      }
    }
    if (!category || category === 'HTTP') {
      this.unknownDependencies.push(dependency)
    }
  }

  public addComponentDependency(componentName: string) {
    if (!this.dependencyCategories.includes('HTTP')) {
      this.dependencyCategories.push('HTTP')
    }
    this.knownDependencies[componentName] = undefined
  }

  public resolveDependency(componentName: string, ref: ComponentNode) {
    if (ref) {
      // eslint-disable-next-line no-param-reassign
      ref.reliedUponBy[this.name] = this
    }
    this.knownDependencies[componentName] = ref
  }

  public getAllDependencies(): ComponentNode[] {
    return Object.values(this.getAllDependencies_int(this))
  }

  public getAllDependencyPaths(): ComponentNode[][] {
    return this.getAllDependenciesPaths_int(this)
  }

  public getAllDependents(): ComponentNode[] {
    return Object.values(this.getAllDependents_int(this))
  }

  public getAllDependentPaths(): ComponentNode[][] {
    return this.getAllDependentPaths_int(this)
  }

  // All the paths that rely on the specifed component
  private getAllDependentPaths_int(component: ComponentNode = this, path: ComponentNode[] = []): ComponentNode[][] {
    if (path.map(s => s.name).includes(component.name)) {
      return [[...path, { name: `*INF* (${component.name})` } as ComponentNode]]
    }
    path.push(component)
    if (!component.reliedUponBy.length) {
      return [path]
    }
    const result = Object.values(component.reliedUponBy).flatMap(rel => this.getAllDependentPaths_int(rel, [...path]))
    return result
  }

  // All the components that rely on this component (at any depth)
  private getAllDependents_int(
    component: ComponentNode = this,
    parent: ComponentNode = undefined,
    seen: Record<string, ComponentNode> = {},
  ): Record<string, ComponentNode> {
    if (seen[component.name]) {
      return seen
    }
    if (parent) {
      // eslint-disable-next-line no-param-reassign
      seen[component.name] = component
    }

    const reliedOnBy = Object.values(component.reliedUponBy)
    if (!reliedOnBy.length) {
      return seen
    }
    const result = reliedOnBy
      .filter(rel => !seen[rel.name])
      .reduce((acc, rel) => {
        return {
          ...acc,
          ...this.getAllDependents_int(rel, component, seen),
        }
      }, {})
    return result
  }

  private getAllDependenciesPaths_int(component: ComponentNode = this, path: ComponentNode[] = []): ComponentNode[][] {
    if (path.map(s => s.name).includes(component.name)) {
      // Cope with loops in graph
      return [[...path, { name: `*INF* (${component.name})` } as ComponentNode]]
    }
    path.push(component)

    const dependencies = Object.values(component.knownDependencies)
    if (!dependencies.length) {
      return [path]
    }
    const result = dependencies.flatMap(rel => this.getAllDependenciesPaths_int(rel, [...path]))
    return result
  }

  private getAllDependencies_int(
    component: ComponentNode = this,
    parent: ComponentNode = undefined,
    seen: Record<string, ComponentNode> = {},
  ): Record<string, ComponentNode> {
    if (seen[component.name]) {
      return seen
    }
    if (parent) {
      // eslint-disable-next-line no-param-reassign
      seen[component.name] = component
    }

    const dependencies = Object.values(component.knownDependencies)
    if (!dependencies.length) {
      return seen
    }
    const result = dependencies
      .filter(rel => !seen[rel?.name])
      .reduce((acc, rel) => {
        return { ...acc, ...this.getAllDependencies_int(rel, component, seen) }
      }, {})
    return result
  }
}
