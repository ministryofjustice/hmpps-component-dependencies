import { EnvType } from './config'
import { type AppInsightsServiceFactory } from './data/appInsights/appInsightsService'
import { AppInsightsService } from './data/appInsights/appInsightsService'
import { Components, type Component, type Dependency } from './data/Components'
import DependencyCalculator from './dependencyCalculator'
import { DependencyInfoGatherer } from './tasks/dependencyInfoGatherer'
import { type DependencyInfo } from './tasks/dependencyInfoGatherer'

const appInsightsService: jest.Mocked<AppInsightsService> = new AppInsightsService(
  null,
) as jest.Mocked<AppInsightsService>

jest.mock('./data/appInsights/appInsightsService')
jest.mock('./tasks/dependencyInfoGatherer')

const dependencyInfoGatherer = new DependencyInfoGatherer() as jest.Mocked<DependencyInfoGatherer>

const sampleDependencies: Dependency[] = [
  {
    componentName: 'component-a',
    dependencyHostname: 'component-b',
    type: 'HTTP',
  },
  {
    componentName: 'component-b',
    dependencyHostname: 'component-c',
    type: 'HTTP',
  },
]

const sampleDependencyInfo: DependencyInfo = {
  categoryToComponent: {
    'backend-services': ['component-a', 'component-b'],
  },
  componentDependencyInfo: {
    'component-a': {
      dependencies: {
        components: ['component-b'],
        categories: [],
        other: [],
      },
      dependents: [],
    },
  },
  missingServices: [],
}

let calculator: DependencyCalculator
let factory: jest.MockedFunction<AppInsightsServiceFactory>

const sampleComponent: Component = {
  name: 'component-a',
  cloudRoleName: 'component-a',
  dependentCount: 0,
  envs: [
    {
      documentId: 'documentidcomp1env1',
      name: 'dev',
      hostname: 'http://component-a',
      clusterHostname: 'component-a.dev.svc.cluster.local',
    },
    {
      documentId: 'documentidcomp1env2',
      name: 'preprod',
      hostname: 'http://component-a',
      clusterHostname: 'component-a.preprod.svc.cluster.local',
    },
  ],
}

describe('DependencyCalculator', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    factory = jest.fn().mockReturnValue(appInsightsService)
    calculator = new DependencyCalculator(factory, dependencyInfoGatherer)
  })

  test('calculates dependencies for all configured environments', async () => {
    const components = new Components([sampleComponent])

    appInsightsService.getDependencies = jest.fn().mockResolvedValue(sampleDependencies)
    dependencyInfoGatherer.gatherDependencyInfo.mockReturnValue(sampleDependencyInfo)

    const result = await calculator.calculateDependencies(components)

    expect(result).toHaveProperty(EnvType.DEV)
    expect(result[EnvType.DEV]).toEqual(sampleDependencyInfo)
  })

  test('calls app insights service factory with correct credentials', async () => {
    const components = new Components([sampleComponent])

    appInsightsService.getDependencies = jest.fn().mockResolvedValue(sampleDependencies)
    dependencyInfoGatherer.gatherDependencyInfo.mockReturnValue(sampleDependencyInfo)

    await calculator.calculateDependencies(components)

    expect(factory).toHaveBeenCalled()
  })

  test('retrieves dependencies from app insights for each environment', async () => {
    const components = new Components([sampleComponent])

    appInsightsService.getDependencies = jest.fn().mockResolvedValue(sampleDependencies)
    dependencyInfoGatherer.gatherDependencyInfo.mockReturnValue(sampleDependencyInfo)

    await calculator.calculateDependencies(components)

    expect(appInsightsService.getDependencies).toHaveBeenCalled()
  })

  test('builds component map and gathers dependency info', async () => {
    const components = new Components([sampleComponent])

    appInsightsService.getDependencies = jest.fn().mockResolvedValue(sampleDependencies)
    dependencyInfoGatherer.gatherDependencyInfo.mockReturnValue(sampleDependencyInfo)

    await calculator.calculateDependencies(components)

    expect(dependencyInfoGatherer.gatherDependencyInfo).toHaveBeenCalled()
  })
})
