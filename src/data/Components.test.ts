import { Component, Components } from './Components'

describe('Components', () => {
  test('one way dependency between two known components', () => {
    const component1: Component = { name: 'comp-1', cloudRoleName: 'comp1', environments: [{ name: 'dev', url: 'http://component1' }] }
    const component2: Component = { name: 'comp-2', cloudRoleName: 'comp2', environments: [{ name: 'dev', url: 'http://component2' }] }

    const components = new Components([component1, component2])

    const map = components.buildComponentMap([{ componentName: component1.name, type: 'http', dependencyHostname: component2.environments[0].url }])

    {
      const node = map[component1.name]

      expect(node.component).toStrictEqual(component1)
      expect(node.unknownDependencies).toStrictEqual([])
      expect(node.reliedUponBy).toStrictEqual({})
      expect(node.dependencyCategories).toStrictEqual(['HTTP'])
      expect(node.knownDependencies[component2.name].component).toStrictEqual(component2)
    }

    {
      const node = map[component2.name]

      expect(node.component).toStrictEqual(component2)
      expect(node.unknownDependencies).toStrictEqual([])
      expect(node.reliedUponBy[component1.name].component).toStrictEqual(component1)
      expect(node.dependencyCategories).toStrictEqual([])
      expect(node.knownDependencies).toStrictEqual({})
    }
  })

  test('two way dependency between two known components', () => {
    const component1: Component = { name: 'comp-1', cloudRoleName: 'comp1', environments: [{ name: 'dev', url: 'http://component1' }] }
    const component2: Component = { name: 'comp-2', cloudRoleName: 'comp2', environments: [{ name: 'dev', url: 'http://component2' }] }

    const components = new Components([component1, component2])

    const map = components.buildComponentMap([
      { componentName: component1.name, type: 'http', dependencyHostname: component2.environments[0].url },
      { componentName: component2.name, type: 'http', dependencyHostname: component1.environments[0].url },
    ])

    {
      const node = map[component1.name]

      expect(node.component).toStrictEqual(component1)
      expect(node.unknownDependencies).toStrictEqual([])
      expect(node.reliedUponBy[component2.name].component).toStrictEqual(component2)
      expect(node.dependencyCategories).toStrictEqual(['HTTP'])
      expect(node.knownDependencies[component2.name].component).toStrictEqual(component2)
    }

    {
      const node = map[component2.name]

      expect(node.component).toStrictEqual(component2)
      expect(node.unknownDependencies).toStrictEqual([])
      expect(node.reliedUponBy[component1.name].component).toStrictEqual(component1)
      expect(node.dependencyCategories).toStrictEqual(['HTTP'])
      expect(node.knownDependencies[component1.name].component).toStrictEqual(component1)
    }
  })

  test('map with one way dependency between one known components and one unknown component', () => {
    const component1: Component = { name: 'comp-1', cloudRoleName: 'comp1', environments: [{ name: 'dev', url: 'http://component1' }] }

    const components = new Components([component1])

    const map = components.buildComponentMap([{ componentName: component1.name, type: 'http', dependencyHostname: 'http://some-unknown' }])

    {
      const node = map[component1.name]

      expect(node.component).toStrictEqual(component1)
      expect(node.unknownDependencies).toStrictEqual([{ componentName: 'comp-1', dependencyHostname: 'http://some-unknown', type: 'http' }])
      expect(node.reliedUponBy).toStrictEqual({})
      expect(node.dependencyCategories).toStrictEqual(['HTTP'])
      expect(node.knownDependencies).toStrictEqual({})
    }
  })

  test('Component with Gotenberg', () => {
    const component1: Component = { name: 'comp-1', cloudRoleName: 'comp1', environments: [{ name: 'dev', url: 'http://component1' }] }

    const components = new Components([component1])

    const map = components.buildComponentMap([{ componentName: component1.name, type: 'http', dependencyHostname: 'http://gotenberg' }])

    {
      const node = map[component1.name]

      expect(node.component).toStrictEqual(component1)
      expect(node.unknownDependencies).toStrictEqual([])
      expect(node.reliedUponBy).toStrictEqual({})
      expect(node.dependencyCategories).toStrictEqual(['GOTENBERG'])
      expect(node.knownDependencies).toStrictEqual({})
    }
  })
})
