import { DependencyCountService } from './dependency-count-sc-update'
import { ComponentInfo } from './dependency-info-gatherer'
import ComponentService from './data/serviceCatalogue'
import { Component, Components } from './data/Components'
import logger from './utils/logger'

describe('DependencyCountService ', () => {
  let dependencyCountService: DependencyCountService
  let mockComponentService: jest.Mocked<ComponentService>

  beforeEach(() => {
    dependencyCountService = new DependencyCountService()

    mockComponentService = {
      putComponent: jest.fn(),
    } as unknown as jest.Mocked<ComponentService>

    jest.spyOn(logger, 'info').mockImplementation(() => {})
    jest.spyOn(logger, 'warn').mockImplementation(() => {})

  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('getDependencyCounts', () => {
    it('should return an empty array when no components are provided', () => {
      const componentDependencies: Record<string, ComponentInfo> = {}
      const components = new Components([]) // Pass empty components
      const result = dependencyCountService.getDependencyCounts(componentDependencies, components.components)
      expect(result).toEqual([])
    })

    it('should calculate dependency counts for components with dependents', () => {
      const component1: Component = {
        documentId: 'doc-1',
        name: 'ComponentA',
        cloudRoleName: 'ComponentA',
        dependentCount: 0,
        envs: [
          {
            name: 'dev',
            hostname: 'http://component1',
            clusterHostname: 'ComponentA.ComponentA-dev.svc.cluster.local',
          },
        ],
      }
      const component2: Component = {
        documentId: 'doc-2',
        name: 'ComponentB',
        cloudRoleName: 'ComponentB',
        dependentCount: 12,
        envs: [
          {
            name: 'dev',
            hostname: 'http://component2',
            clusterHostname: 'ComponentB.ComponentB-dev.svc.cluster.local',
          },
        ],
      }
      const component3: Component = {
        documentId: 'doc-3',
        name: 'ComponentC',
        cloudRoleName: 'ComponentC',
        dependentCount: 5,
        envs: [
          {
            name: 'dev',
            hostname: 'http://component3',
            clusterHostname: 'ComponentC.ComponentC-dev.svc.cluster.local',
          },
        ],
      }

      const components = new Components([component1, component2, component3])

      const componentDependencies: Record<string, ComponentInfo> = {
        ComponentA: {
          dependents: [
            { name: 'ComponentB', isKnownComponent: true },
            { name: 'ComponentC', isKnownComponent: true },
          ],
          dependencies: { components: [], categories: [], other: [] },
        },
        ComponentB: {
          dependents: [{ name: 'ComponentC', isKnownComponent: true }],
          dependencies: { components: [], categories: [], other: [] },
        },
        ComponentC: {
          dependents: [],
          dependencies: { components: [], categories: [], other: [] },
        },
      }

      const result = dependencyCountService.getDependencyCounts(componentDependencies, components.components)

      expect(result).toEqual([
        { documentId: 'doc-1', componentName: 'ComponentA', dependentCount: 2 },
        { documentId: 'doc-2', componentName: 'ComponentB', dependentCount: 1 },
        { documentId: 'doc-3', componentName: 'ComponentC', dependentCount: 0 },
      ])
    })

    it('should handle components with no dependents property', () => {
      const component1: Component = {
        documentId: 'doc-1',
        name: 'ComponentA',
        cloudRoleName: 'ComponentA',
        dependentCount: 3,
        envs: [
          {
            name: 'dev',
            hostname: 'http://component1',
            clusterHostname: 'ComponentA.ComponentA-dev.svc.cluster.local',
          },
        ],
      }
      const component2: Component = {
        documentId: 'doc-2',
        name: 'ComponentB',
        cloudRoleName: 'ComponentB',
        dependentCount: 2,
        envs: [
          {
            name: 'dev',
            hostname: 'http://component2',
            clusterHostname: 'ComponentB.ComponentB-dev.svc.cluster.local',
          },
        ],
      }

      const components = new Components([component1, component2])

      const componentDependencies: Record<string, ComponentInfo> = {
        ComponentA: {
          dependents: [{ name: 'ComponentB', isKnownComponent: true }],
          dependencies: { components: [], categories: [], other: [] },
        },
        ComponentB: {
          dependents: [],
          dependencies: { components: [], categories: [], other: [] },
        },
      }

      const result = dependencyCountService.getDependencyCounts(componentDependencies, components.components)

      expect(result).toEqual([
        { documentId: 'doc-1', componentName: 'ComponentA', dependentCount: 1 },
        { documentId: 'doc-2', componentName: 'ComponentB', dependentCount: 0 },
      ])
    })

    it('should handle components with empty dependents arrays', () => {
      const component1: Component = {
        documentId: 'doc-1',
        name: 'ComponentA',
        cloudRoleName: 'ComponentA',
        dependentCount: 2,
        envs: [
          {
            name: 'dev',
            hostname: 'http://component1',
            clusterHostname: 'ComponentA.ComponentA-dev.svc.cluster.local',
          },
        ],
      }

      const components = new Components([component1])

      const componentDependencies: Record<string, ComponentInfo> = {
        ComponentA: {
          dependents: [],
          dependencies: { components: [], categories: [], other: [] },
        },
        ComponentB: {
          dependents: [],
          dependencies: { components: [], categories: [], other: [] },
        },
      }

      const result = dependencyCountService.getDependencyCounts(componentDependencies, components.components)

      expect(result).toEqual([{ documentId: 'doc-1', componentName: 'ComponentA', dependentCount: 0 }])
    })

    it('should handle if service catalogue components has missing component', () => {
      const component1: Component = {
        documentId: 'doc-1',
        name: 'ComponentA',
        cloudRoleName: 'ComponentA',
        dependentCount: 1,
        envs: [
          {
            name: 'dev',
            hostname: 'http://componentA',
            clusterHostname: 'ComponentA.ComponentA-dev.svc.cluster.local',
          },
        ],
      }

      const components = new Components([component1])

      const componentDependencies: Record<string, ComponentInfo> = {
        ComponentA: {
          dependents: [{ name: 'ComponentB', isKnownComponent: true }],
          dependencies: { components: [], categories: [], other: [] },
        },
      }

      const result = dependencyCountService.getDependencyCounts(componentDependencies, components.components)

      expect(result).toHaveLength(0)
    })

    it('should not update service catalogue if dependent_count is matching', () => {
      const component1: Component = {
        documentId: 'doc-2',
        name: 'ComponentB',
        cloudRoleName: 'Component2',
        dependentCount: 2,
        envs: [
          {
            name: 'dev',
            hostname: 'http://component2',
            clusterHostname: 'ComponentB.ComponentB-dev.svc.cluster.local',
          },
        ],
      }

      const components = new Components([component1])

      const componentDependencies: Record<string, ComponentInfo> = {
        ComponentA: {
          // Missing in validComponents
          dependents: [],
          dependencies: { components: [], categories: [], other: [] },
        },
        ComponentB: {
          dependents: [],
          dependencies: { components: [], categories: [], other: [] },
        },
      }

      const result = dependencyCountService.getDependencyCounts(componentDependencies, components.components)

      expect(result).toEqual([{ documentId: 'doc-2', componentName: 'ComponentB', dependentCount: 0 }])
    })  
  })

  describe('updateServiceCatalogueComponentDependentCount', () => {
    it('should update service catalogue with dependency counts for PROD environment', async () => {
      const component1: Component = {
        documentId: 'doc-1',
        name: 'ComponentA',
        cloudRoleName: 'ComponentA',
        dependentCount: 0,
        envs: [
          {
            name: 'dev',
            hostname: 'http://component1',
            clusterHostname: 'ComponentA.ComponentA-dev.svc.cluster.local',
          },
        ],
      }
      const components = new Components([component1])

      const componentDependencies: [string, any][] = [
        [
          'PROD',
          {
            componentDependencyInfo: {
              ComponentA: {
                dependents: [{ name: 'ComponentB', isKnownComponent: true }],
                dependencies: { components: [], categories: [], other: [] },
              },
            },
          },
        ],
      ]

      await dependencyCountService.updateServiceCatalogueComponentDependentCount(
        componentDependencies as [any, any][],
        components,
        mockComponentService,
      )

      expect(mockComponentService.putComponent).toHaveBeenCalledWith('doc-1', 1)
    })

    it('should log a warning if no PROD environment is found', async () => {
      const components = new Components([])

      const componentDependencies: [string, any][] = [
        [
          'DEV',
          {
            componentDependencyInfo: {},
          },
        ],
      ]

      await dependencyCountService.updateServiceCatalogueComponentDependentCount(
        componentDependencies as [any, any][],
        components,
        mockComponentService,
      )

      expect(logger.warn).toHaveBeenCalledWith('No PROD environment found in componentDependencies.')
      expect(mockComponentService.putComponent).not.toHaveBeenCalled()
    })

    it('should log a warning if a component is not found in the service catalogue', async () => {
      const componentName = 'MissingComponent'
      const components = new Components([]) // Empty components list to simulate missing component

      const componentDependencies: [string, any][] = [
        [
          'PROD',
          {
            componentDependencyInfo: {
              [componentName]: {
                dependents: [],
                dependencies: { components: [], categories: [], other: [] },
              },
            },
          },
        ],
      ]

      await dependencyCountService.updateServiceCatalogueComponentDependentCount(
        componentDependencies as [any, any][],
        components,
        mockComponentService,
      )

      expect(logger.warn).toHaveBeenCalledWith(`Component ${componentName} not found in service catalogue.`)
      expect(mockComponentService.putComponent).not.toHaveBeenCalled()
    })
  })
})
