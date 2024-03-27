import { buildComponentMap } from "./build-tree";
import { gatherComponentDependencies, componentLookup } from "./data-sources";
import { gather } from "./dependency-info-gatherer";

const run = async () => {
  const dependencies = await gatherComponentDependencies();
  const components = buildComponentMap(dependencies, componentLookup);

  const { categoryToComponent, componentDependencyInfo, unknownDependencies } =
    await gather(components);

  unknownDependencies.forEach((dependency) => console.log(dependency));

  Object.entries(categoryToComponent).forEach(([category, components]) =>
    console.log(`${category} =>  ${components}\n`)
  );

  console.log(
    JSON.stringify(componentDependencyInfo["whereabouts-api"], null, 4)
  );
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
