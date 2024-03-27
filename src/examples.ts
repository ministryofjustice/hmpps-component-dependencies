import { buildComponentMap } from "./build-tree";
import { gatherComponentDependencies, componentLookup } from "./data-sources";

const run = async () => {
  const dependencies = await gatherComponentDependencies();
  const components = buildComponentMap(dependencies, componentLookup);

  const componentName = "create-and-vary-a-licence-api"; // "nomis-user-roles-api";
  const component = components[componentName];

  console.log("\n *** Print info about things that rely on us *** \n");

  console.log(
    component
      .getAllDependents()
      .map((c) => c.name)
      .sort()
  );

  console.log(
    component
      .getAllDependentPaths()
      .map((p) => p.map((s) => s.name).join(" => "))
  );

  console.log("\n *** Print info about things we rely on *** \n");

  console.log(
    component
      .getAllDependencies()
      .map((c) => c.name)
      .sort()
  );

  console.log(
    component
      .getAllDependencyPaths()
      .map((p) => p.map((s) => s.name).join(" => "))
  );
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
