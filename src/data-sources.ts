import fs from "fs";
import { getDependencies } from "./appInsights";
/**
 * Pulled from service catalogue, e.g: 
 * curl -X 'GET' \
  'https://service-catalogue.hmpps.service.justice.gov.uk/v1/components?populate=environments' \
  -H 'accept: application/json'| jq -r '.data ' > components.json
 */
const COMPONENT_JSON_FILE = "components.json";

type Component = {
  name: string;
  environments: { name: string; url: string }[];
};

const components: Component[] = JSON.parse(
  fs.readFileSync(COMPONENT_JSON_FILE, "utf-8")
)
  .filter((entry: any) => entry.environments.length)
  .map((entry: any) => ({
    name: entry.name,
    environments: entry.environments
      .filter((env: any) => env.url)
      .map((env: any) => ({
        name: env.name,
        url: env.url.replace("https://", ""),
      })),
  }));

const lookup = Object.fromEntries(
  components.flatMap((check: Component) => {
    const { name, environments } = check;
    return environments.map((env: any) => [env.url, name]);
  })
);

// A mechanism to find the name of a component based on it's hostname
export type ComponentLookup = (hostname: string) => string;
export const componentLookup: ComponentLookup = (hostname) => lookup[hostname];

// A component name to the hostname it relies on.
export type Dependency = [
  componentName: string,
  dependencyHostname: string,
  type: string
];

// We need to seed with known services to ensure we create nodes for things with no dependencies that may be relied on by other things
const knownComponents: Dependency[] = components.map((check) => [
  check.name,
  undefined,
  "component",
]);

export const gatherComponentDependencies = async () => {
  const dependencies: Dependency[] = (await getDependencies()).rows.map(
    (row) => [row[0], row[1], row[2]]
  );
  return knownComponents.concat(dependencies);
};
