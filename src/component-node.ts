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
}
