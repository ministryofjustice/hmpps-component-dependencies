/* eslint-disable no-console */
import { buildComponentMap } from './build-tree'
import config from './config'
import { gatherComponentDependencies, componentLookup } from './data/data-sources'
import gatherDependencyInfo from './dependency-info-gatherer'

const run = async () => {
  const dependencies = await gatherComponentDependencies(config.environments.dev)
  const componentMap = buildComponentMap(dependencies, componentLookup)

  const { categoryToComponent, componentDependencyInfo, unknownDependencies } = await gatherDependencyInfo(componentMap)

  unknownDependencies.forEach(dependency => console.log(dependency))

  Object.entries(categoryToComponent).forEach(([category, components]) => console.log(`${category} =>  ${components}\n`))

  console.log(JSON.stringify(componentDependencyInfo['whereabouts-api'], null, 4))
}

run().catch(e => {
  console.error(e)
  process.exit(1)
})
