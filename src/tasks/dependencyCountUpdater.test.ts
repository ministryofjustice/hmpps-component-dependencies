import { DependencyCountService } from './dependencyCountUpdater'
import ComponentService from '../data/serviceCatalogue/componentService'
import { type Components, type Component } from '../data/Components'
import { EnvType } from '../config'
import logger from '../utils/logger'
import { type ComponentInfo, type DependencyInfo } from './dependencyInfoGatherer'

jest.mock('../data/serviceCatalogue/componentService')

describe('DependencyCountService ', () => {
  let dependencyCountService: DependencyCountService
  let componentService: jest.Mocked<ComponentService>

  beforeEach(() => {
    componentService = new ComponentService(null) as jest.Mocked<ComponentService>
    dependencyCountService = new DependencyCountService(componentService)

    jest.spyOn(logger, 'info').mockImplementation(() => {})
    jest.spyOn(logger, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.resetAllMocks()
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
            documentId: 'documentidcomp1env1',
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
            documentId: 'documentidcomp2env1',
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
            documentId: 'documentidcomp3env1',
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

    it('should handle components with empty dependents arrays', () => {
      const component1: Component = {
        documentId: 'doc-1',
        name: 'ComponentA',
        cloudRoleName: 'ComponentA',
        dependentCount: 2,
        envs: [
          {
            documentId: 'documentidcomp1env1',
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
            documentId: 'documentidcomp1env1',
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
            documentId: 'documentidcomp2env1',
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

  describe('update component dependent count', () => {
    it('should update service catalogue with dependency counts for PROD environment', async () => {
      const component1: Component = {
        documentId: 'doc-1',
        name: 'ComponentA',
        cloudRoleName: 'ComponentA',
        dependentCount: 0,
        envs: [
          {
            documentId: 'documentidcomp1env1',
            name: 'prod',
            hostname: 'http://component1',
            clusterHostname: 'ComponentA.ComponentA-prod.svc.cluster.local',
          },
        ],
      }
      const components = new Components([component1])

      const componentDependencies: Record<EnvType, DependencyInfo> = {
        [EnvType.PROD]: {
          categoryToComponent: {},
          componentDependencyInfo: {
            ComponentA: {
              dependents: [{ name: 'ComponentB', isKnownComponent: true }],
              dependencies: { components: [], categories: [], other: [] },
            },
          },
          missingServices: [],
        } as DependencyInfo,
      } as Record<EnvType, DependencyInfo>

      await dependencyCountService.updateComponentDependentCount(componentDependencies, components)

      expect(componentService.putComponent).toHaveBeenCalledWith('doc-1', 1)
    })

    it('should log a warning if no PROD environment is found', async () => {
      const components = new Components([])

      const componentDependencies: Record<EnvType, DependencyInfo> = {
        [EnvType.DEV]: {
          categoryToComponent: {},
          componentDependencyInfo: {},
          missingServices: [],
        },
      } as Record<EnvType, DependencyInfo>

      await dependencyCountService.updateComponentDependentCount(componentDependencies, components)

      expect(logger.warn).toHaveBeenCalledWith('No PROD environment found in componentDependencies.')
      expect(componentService.putComponent).not.toHaveBeenCalled()
    })

    it('should log a warning if a component is not found in the service catalogue', async () => {
      const componentName = 'MissingComponent'
      const components = new Components([]) // Empty components list to simulate missing component

      const componentDependencies: Record<EnvType, DependencyInfo> = {
        [EnvType.PROD]: {
          categoryToComponent: {},
          componentDependencyInfo: {
            [componentName]: {
              dependents: [],
              dependencies: { components: [], categories: [], other: [] },
            },
          },
          missingServices: [],
        } as DependencyInfo,
      } as Record<EnvType, DependencyInfo>

      await dependencyCountService.updateComponentDependentCount(componentDependencies, components)

      expect(logger.warn).toHaveBeenCalledWith(`Component ${componentName} not found in service catalogue.`)
      expect(componentService.putComponent).not.toHaveBeenCalled()
    })
  })
})
