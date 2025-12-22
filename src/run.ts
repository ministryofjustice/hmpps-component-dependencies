import initialiseAppInsights, { flush } from './utils/appInsights'
import applicationInfo from './utils/applicationInfo'

import config, { EnvType, type Environment } from './config'
import gatherDependencyInfo, { type DependencyInfo } from './dependency-info-gatherer'
import getComponents from './data/serviceCatalogue'
import { postComponent } from './data/serviceCatalogue'
import getDependencies from './data/appInsights'
import { createRedisClient } from './data/redis/redisClient'
import RedisService from './data/redis/redisService'
import logger from './utils/logger'
import { type Components } from './data/Components'
import { type ServiceCatalogueComponent } from './data/serviceCatalogue/Client'

initialiseAppInsights(applicationInfo())

const calculateDependencies = async (
  { env, appInsightsCreds }: Environment,
  components: Components,
): Promise<[EnvType, DependencyInfo]> => {
  const dependencies = await getDependencies(appInsightsCreds)
  const componentMap = components.buildComponentMap(dependencies)
  const { categoryToComponent, componentDependencyInfo, missingServices } = gatherDependencyInfo(componentMap)

  logger.info(`${env}: Services missing from service catalogue: \n\t${missingServices.join('\n\t')}`)

  const categoryCounts = Object.entries(categoryToComponent).map(
    ([category, comps]) => `${category} =>  ${comps.length}`,
  )
  logger.info(`${env}: Category freqs: \n${categoryCounts.join('\n')}`)

  return [env, { categoryToComponent, componentDependencyInfo, missingServices }]
}

const run = async () => {
  const redisClient = createRedisClient()
  await redisClient.connect()

  const redisService = new RedisService(redisClient)

  logger.info(`Starting to gather dependency info`)

  const components = await getComponents()

  const componentDependencies = await Promise.all(
    config.environments.map(environment => calculateDependencies(environment, components)),
  )

  logger.info(`Starting to publish dependency info`)

  const data = Object.fromEntries(componentDependencies)

  await redisService.write(data)

  logger.info(`Finished publishing dependency info`)

  await redisClient.quit()
  await flush()

  logger.info('Updating service catalogue with dependent counts')
  const prodDependencies = componentDependencies.filter(dep => Object.keys(dep).includes("PROD"))
  for (const componentName of Object.keys(prodDependencies)) {
    const details = prodDependencies[componentName] || {}
    const dependents = details.dependents || []
    const dependent_count = dependents.length
    const matchingComponent = components.find((component: ServiceCatalogueComponent)  => component.app_insights_cloud_role_name === componentName)

    if (matchingComponent) {
      const documentId = matchingComponent.documentId

      // Call postComponent to update the dependent_count for the component
      await postComponent(documentId, dependent_count)
    } else {
      logger.warn(`Component with name ${componentName} not found in components list.`)
    }
  }
}

run().catch(async e => {
  logger.error(e)
  await flush()
  process.exit(1)
})
