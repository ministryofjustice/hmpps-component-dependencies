import { dependencyCountCalculator } from './dependency-count-calculator'
import { ComponentInfo } from './dependency-info-gatherer'

describe('dependencyCountCalculator', () => {
  describe('getDependencyCounts', () => {
    it('should return an empty array when no components are provided', () => {
      const componentDependencies: Record<string, ComponentInfo> = {}
      const result = dependencyCountCalculator.getDependencyCounts(componentDependencies)
      expect(result).toEqual([])
    })

    it('should calculate dependency counts for components with dependents', () => {
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

      const result = dependencyCountCalculator.getDependencyCounts(componentDependencies)

      expect(result).toEqual([
        ['ComponentA', 2],
        ['ComponentB', 1],
        ['ComponentC', 0],
      ])
    })

    it('should handle components with no dependents property', () => {
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

      const result = dependencyCountCalculator.getDependencyCounts(componentDependencies)

      expect(result).toEqual([
        ['ComponentA', 1],
        ['ComponentB', 0],
      ])
    })

    it('should handle components with empty dependents arrays', () => {
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

      const result = dependencyCountCalculator.getDependencyCounts(componentDependencies)

      expect(result).toEqual([
        ['ComponentA', 0],
        ['ComponentB', 0],
      ])
    })
  })
})
