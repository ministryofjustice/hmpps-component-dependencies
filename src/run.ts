import { buildComponentMap } from "./build-tree";
import { componentDependencies, componentLookup } from "./data-sources";

const components = buildComponentMap(componentDependencies, componentLookup);

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

console.log("\n *** unknown components *** \n");

const uniqueUnknowns = [
  ...new Set(
    Object.values(components)
      .flatMap((s) => s.unknownDependencies)
      .sort()
  ),
];

uniqueUnknowns
  .filter((url) => url.includes("service.justice.gov.uk"))
  .forEach((u) => console.log(u));
