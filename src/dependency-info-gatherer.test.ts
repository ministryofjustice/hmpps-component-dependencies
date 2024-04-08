import { Component, Components } from './data/Components'
import gatherDependencyInfo from './dependency-info-gatherer'

describe('DependencyInfoGatherer', () => {
  test('simple example', () => {
    const component1: Component = { name: 'comp-1', cloudRoleName: 'comp1', environments: [{ name: 'dev', url: 'http://component1' }] }
    const component2: Component = { name: 'comp-2', cloudRoleName: 'comp2', environments: [{ name: 'dev', url: 'http://component2' }] }
    const component3: Component = { name: 'comp-3', cloudRoleName: 'comp3', environments: [{ name: 'dev', url: 'http://component3' }] }

    const components = new Components([component1, component2, component3])

    const map = components.buildComponentMap([
      { componentName: component1.name, type: 'http', dependencyHostname: component2.environments[0].url },
      { componentName: component1.name, dependencyHostname: 'http://some-unknown', type: 'http' },
      { componentName: component2.name, type: 'http', dependencyHostname: component1.environments[0].url },
      { componentName: component3.name, type: 'http', dependencyHostname: component1.environments[0].url },
      { componentName: component3.name, type: 'another-category-type', dependencyHostname: 'aaaaaaa' },
      { componentName: 'component-not-in-service-catalogue', type: 'http', dependencyHostname: component1.environments[0].url },
      { componentName: 'missing-service-1', dependencyHostname: 'http://some-unknown.service.justice.gov.uk', type: 'http' },
      { componentName: component1.name, type: 'http', dependencyHostname: 'http://gotenberg' },
    ])

    const dependencyInfo = gatherDependencyInfo(map)

    expect(dependencyInfo).toStrictEqual({
      categoryToComponent: {
        HTTP: ['comp-1', 'comp-2', 'comp-3', 'component-not-in-service-catalogue', 'missing-service-1'],
        GOTENBERG: ['comp-1'],
        'another-category-type': ['comp-3'],
      },
      componentDependencyInfo: {
        'comp-1': {
          dependencies: { components: ['comp-2'], categories: ['HTTP', 'GOTENBERG'], other: [{ name: 'http://some-unknown', type: 'http' }] },
          dependents: [
            { name: 'comp-2', isKnownComponent: true },
            { name: 'comp-3', isKnownComponent: true },
            { name: 'component-not-in-service-catalogue', isKnownComponent: false },
          ],
        },
        'comp-2': {
          dependencies: { components: ['comp-1'], categories: ['HTTP'], other: [] },
          dependents: [{ name: 'comp-1', isKnownComponent: true }],
        },
        'comp-3': {
          dependencies: { components: ['comp-1'], categories: ['HTTP', 'another-category-type'], other: [] },
          dependents: [],
        },
        'component-not-in-service-catalogue': {
          dependencies: { components: ['comp-1'], categories: ['HTTP'], other: [] },
          dependents: [],
        },
        'missing-service-1': {
          dependencies: { components: [], categories: ['HTTP'], other: [{ name: 'http://some-unknown.service.justice.gov.uk', type: 'http' }] },
          dependents: [],
        },
      },
      missingServices: ['http://some-unknown.service.justice.gov.uk'],
    })
  })
})
