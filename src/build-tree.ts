import { ComponentNode } from "./component-node";
import type { ComponentLookup, Dependency } from "./data-sources";

export type Components = Record<string, ComponentNode>;

export const buildComponentMap = (
  dependencies: Dependency[],
  lookup: ComponentLookup
): Components => {
  const componentMap = dependencies.reduce((acc, dependency) => {
    const [componentName, url] = dependency;
    const component = acc[componentName] || new ComponentNode(componentName);
    const dependentComponent = lookup(url);
    if (dependentComponent) {
      component.addDependency(dependentComponent);
    } else {
      if (url) component.addUnknownDependency(dependency);
    }
    acc[componentName] = component;
    return acc;
  }, {} as Record<string, ComponentNode>);

  /** Go through map and resolve each dependency by linking to other component nodes */
  Object.values(componentMap).forEach((component) => {
    Object.keys(component.knownDependencies).forEach((dependency) => {
      component.resolveDependency(dependency, componentMap[dependency]);
    });
  });
  return componentMap;
};
