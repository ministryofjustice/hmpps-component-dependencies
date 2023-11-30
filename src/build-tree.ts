import { ComponentNode } from "./component-node";
import type { ComponentLookup, Dependency } from "./data-sources";

export const buildComponentMap = (
  dependencies: Dependency[],
  lookup: ComponentLookup
) => {
  const componentMap = dependencies.reduce((acc, [componentName, url]) => {
    const component = acc[componentName] || new ComponentNode(componentName);
    const dependentComponent = lookup(url);
    if (dependentComponent) {
      component.addDependency(dependentComponent);
    } else {
      if (url) component.addUnknownDependency(url);
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
