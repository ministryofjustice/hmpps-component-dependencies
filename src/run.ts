/* eslint-disable no-console */
import initialiseAppInsights from './utils/appInsights'
import applicationInfo from './utils/applicationInfo'

import config, { type Environment } from './config'
import type { ComponentInfo, Dependency } from './data/ComponentInfo'
import gatherDependencyInfo from './dependency-info-gatherer'
import getComponents from './data/serviceCatalogue'
import getDependencies from './data/appInsights'

initialiseAppInsights(applicationInfo())

const gatherComponentDependencies = async (env: Environment, components: ComponentInfo) => {
  const dependencies: Dependency[] = (await getDependencies(env)).rows.map(row => [row[0], row[1], row[2]])
  return components.getKnownComponents().concat(dependencies)
}

const run = async () => {
  const components = await getComponents(config.serviceCatalogueUrl)
  const dependencies = await gatherComponentDependencies(config.environments.dev, components)
  const componentMap = components.getComponentMap(dependencies)

  const { categoryToComponent, componentDependencyInfo, unknownDependencies } = await gatherDependencyInfo(componentMap)

  unknownDependencies.forEach(dependency => console.log(dependency))

  Object.entries(categoryToComponent).forEach(([category, comps]) => console.log(`${category} =>  ${comps}\n`))

  console.log(JSON.stringify(componentDependencyInfo['create-and-vary-a-licence-api'], null, 4))
}

run().catch(e => {
  console.error(e)
  process.exit(1)
})
