import { dependencyCountCalculator } from './dependency-count-calculator'
import { ComponentInfo } from './dependency-info-gatherer'
import { Component, Components } from './data/Components'

describe('dependencyCountCalculator', () => {
  describe('getDependencyCounts', () => {
    it('should return an empty array when no components are provided', () => {
      const componentDependencies: Record<string, ComponentInfo> = {}
      const components = new Components([]) // Pass empty components
      const result = dependencyCountCalculator.getDependencyCounts(componentDependencies, components.components)
      expect(result).toEqual([])
    })

    it('should calculate dependency counts for components with dependents', () => {
      const component1: Component = {
        documentId: 'doc-1',
        name: 'ComponentA',
        cloudRoleName: 'ComponentA',
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

      const result = dependencyCountCalculator.getDependencyCounts(componentDependencies, components.components)

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

      const result = dependencyCountCalculator.getDependencyCounts(componentDependencies, components.components)

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

      const result = dependencyCountCalculator.getDependencyCounts(componentDependencies, components.components)

      expect(result).toEqual([{ documentId: 'doc-1', componentName: 'ComponentA', dependentCount: 0 }])
    })

    it('should handle if service catalogue components has missing component', () => {
      const component1: Component = {
        documentId: 'doc-2',
        name: 'ComponentB',
        cloudRoleName: 'Component2',
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

      const result = dependencyCountCalculator.getDependencyCounts(componentDependencies, components.components)

      expect(result).toEqual([{ documentId: 'doc-2', componentName: 'ComponentB', dependentCount: 0 }])
    })
  })
})
