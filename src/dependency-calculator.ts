import config, { type Environment, type EnvType } from './config'
import type { AppInsightsServiceFactory } from './data/appInsights/appInsightsService'
import type { Components } from './data/Components'
import { DependencyInfoGatherer, type DependencyInfo } from './tasks/dependency-info-gatherer'
import logger from './utils/logger'

export default class DependencyCalculator {
  constructor(
    private readonly appInsightsServiceFactory: AppInsightsServiceFactory,
    private readonly dependencyInfoGatherer: DependencyInfoGatherer,
  ) {}

  async calculateDependencies(components: Components): Promise<Record<EnvType, DependencyInfo>> {
    const results = config.environments.map(environment => {
      return this.calculateEnvironmentDependencies(environment, components)
    })
    const componentDependencies = await Promise.all(results)
    return Object.fromEntries(componentDependencies) as Record<EnvType, DependencyInfo>
  }

  private async calculateEnvironmentDependencies(
    environment: Environment,
    components: Components,
  ): Promise<[EnvType, DependencyInfo]> {
    const { env, appInsightsCreds } = environment
    const appInsightsService = this.appInsightsServiceFactory(appInsightsCreds)
    const dependencies = await appInsightsService.getDependencies()
    const componentMap = components.buildComponentMap(dependencies)
    const { categoryToComponent, componentDependencyInfo, missingServices } =
      this.dependencyInfoGatherer.gatherDependencyInfo(componentMap)

    logger.info(`${env}: Services missing from service catalogue: \n\t${missingServices.join('\n\t')}`)

    const categoryCounts = Object.entries(categoryToComponent).map(
      ([category, comps]) => `${category} =>  ${comps.length}`,
    )
    logger.info(`${env}: Category freqs: \n${categoryCounts.join('\n')}`)

    return [env, { categoryToComponent, componentDependencyInfo, missingServices }]
  }
}
