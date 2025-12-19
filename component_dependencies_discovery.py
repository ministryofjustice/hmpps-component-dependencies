import os
from collections import defaultdict
import json
from hmpps import Slack, GithubSession, ServiceCatalogue
from hmpps.services.job_log_handling import (
  log_debug,
  log_info,
  log_critical,
  job,
)
import redis

class Services:
  def __init__(self, sc_params, gh_params, slack_params, redis_params):
    # self.slack = Slack(slack_params)
    self.sc = ServiceCatalogue(sc_params)
    self.redis_max_stream_length = redis_params['redis_max_stream_length']
    redis_params.pop('redis_max_stream_length')
    self.redis = self.connect_to_redis(redis_params)

  def connect_to_redis(self, redis_params):
    # Test connection to redis
    try:
      log_info('Connecting to redis...')
      log_info(f'Redis params: {redis_params}')
      redis_params['ssl_cert_reqs'] = None
      redis_params['decode_responses'] = True

      redis_session = redis.Redis(**redis_params)
      log_debug('Pinging redis to test connection...')
      redis_session.ping()
      log_info('Successfully connected to redis.')

      log_debug('Redis is ready to go.')
    except Exception as e:
      log_critical('Unable to connect to redis.')
      self.slack.alert(f'*{job.name} failed*: Unable to connect to redis.')
      self.sc.update_scheduled_job('Failed')
      raise SystemExit(e)
    return redis_session

def get_dependency_info(redis_session):
  try:
    # Fetch the JSON data from the 'dependency:info' key
    dependency_info = redis_session.json().get('dependency:info', '$')
        
    if not dependency_info:
      log_debug('No data found for dependency:info.')
      return None
        
    log_info('Successfully retrieved dependency:info.')
    return dependency_info
  except Exception as e:
    log_critical(f'Error retrieving dependency:info: {e}')
    raise

# Calculate dependencies (direct + transitive)
def calculate_dependencies(components):
    def dfs(component, visited):
        if component in visited:
            return set()
        visited.add(component)
        result = set(components[component])
        for dep in components[component]:
            result.update(dfs(dep, visited))
        return result

    dependencies = {}
    for component in components:
        dependencies[component] = len(dfs(component, set()))
    return dependencies

# Calculate dependents (direct + transitive)
def calculate_dependents(components):
    reverse_graph = defaultdict(list)
    for component, deps in components.items():
        for dep in deps:
            reverse_graph[dep].append(component)

    def dfs(component, visited):
        if component in visited:
            return set()
        visited.add(component)
        result = set(reverse_graph[component])
        for dep in reverse_graph[component]:
            result.update(dfs(dep, visited))
        return result

    dependents = {}
    for component in components:
        dependents[component] = len(dfs(component, set()))
    return dependents

def order_components_by_total_dependencies(data, services):
    """
    Order components by the total number of dependencies (including transitive),
    and include dependency categories and dependents count in the output.
    """
    # Extract componentDependencyInfo from the DEV key
    if isinstance(data, list):
        data = data[0]
    component_info = data.get("PROD", {}).get("componentDependencyInfo", {})

    # Build a dependency graph
    graph = defaultdict(list)
    categories_map = {}
    dependents_count = {} 
    for component, details in component_info.items():
        dependencies = details.get("dependencies", {}).get("components", [])
        graph[component].extend(dependencies)

        # Extract categories for each component
        categories = details.get("dependencies", {}).get("categories", [])
        other = details.get("dependencies", {}).get("other", [])
        categories_map[component] = categories + (["other dependency"] if other else [])

        # Calculate dependents count directly from the data
        dependents = details.get("dependents", [])
        dependents_count[component] = len(dependents)
    # Calculate total dependencies and dependents
    dependencies_count = calculate_dependencies(graph)

    # Combine and sort components
    sorted_components = sorted(
        [(comp, dependencies_count[comp], dependents_count[comp]) for comp in graph],
        key=lambda x: (-x[2], -x[1], x[0])  # Sort by dependencies, then dependents, then name
    )

    # Separate components with 0 dependencies and 0 dependents
    independent_components = [
        comp for comp, dep_count, depd_count in sorted_components
        if dep_count == 0 and depd_count == 0
    ]

    # Remove independent components from the sorted_components list
    filtered_sorted_components = [
        (component, dep_count, depd_count) for component, dep_count, depd_count in sorted_components
        if component not in independent_components
    ]
    print(sorted_components)
    # Display the sorted components
    log_info("\nComponents ordered by total number of dependencies (including transitive):")
    for component, dep_count, depd_count in filtered_sorted_components:
        dependencies_components = ", ".join(graph.get(component, []))  # Get dependencies as comma-separated list
        dependent_components = ", ".join(
            [dep for dep, deps in graph.items() if component in deps]
        )  # Get dependents as comma-separated list
        categories = "-".join(categories_map.get(component, []))
        if categories:  # Only include parentheses if categories are not empty
            log_info(f"{component}: {dep_count} total dependencies: {dependencies_components}: {depd_count} dependents: {dependent_components}:({categories})")
        else:
            log_info(f"{component}: {dep_count} total dependencies: {dependencies_components}: {depd_count} dependents: {dependent_components}")

    # Display the independent components
    if independent_components:
        log_info("\nComponents that can be started individually without any dependency:")
        for component in independent_components:
            dependents = dependents_count.get(component, 0)
            categories = "-".join(categories_map.get(component, []))
            if categories:  # Only include parentheses if categories are not empty
                log_info(f"{component}: 0 total dependencies, {dependents} dependents ({categories})")
            else:
                log_info(f"{component}: 0 total dependencies, {dependents} dependents")

    sc_components = services.sc.get_all_records(services.sc.components_get)
    for component in sorted_components:
      sc_component = next((item for item in sc_components if item.get('name') == component[0]), None)
      sc_data = {}
      if sc_component:
        c_id = sc_component.get('documentId', '')
        log_info(f"Updating component: {component[0]}")
        sc_data.update({'dependent_count': component[2]})
        services.sc.update(services.sc.components, c_id, sc_data)
      else:
        log_info(f"Component {component[0]} not found in Service Catalogue. Skipping update.")


def main():
  """Main entry point for the application."""

  # Environment variable takes precedence over config file
  log_level = os.getenv('LOG_LEVEL', 'INFO')

  job.name = 'hmpps-component-dependencies'

  # Set up slack notification params
  slack_params = {
    'token': os.getenv('SLACK_BOT_TOKEN'),
    'notify_channel': os.getenv('SLACK_NOTIFY_CHANNEL', ''),
    'alert_channel': os.getenv('SLACK_ALERT_CHANNEL', ''),
  }

  sc_params = {
    'url': os.getenv('SERVICE_CATALOGUE_API_ENDPOINT', ''),
    'key': os.getenv('SERVICE_CATALOGUE_API_KEY', ''),
    'filter': os.getenv('SC_FILTER', ''),
  }

  # Github parameters
  gh_params = {
    'app_id': int(os.getenv('GITHUB_APP_ID', '0')),
    'app_installation_id': int(os.getenv('GITHUB_APP_INSTALLATION_ID', '0')),
    'app_private_key': os.getenv('GITHUB_APP_PRIVATE_KEY', ''),
  }

  redis_params = {
    'host': os.getenv('REDIS_ENDPOINT'),
    'port': os.getenv('REDIS_PORT'),
    'ssl': os.getenv('REDIS_TLS_ENABLED', 'False').lower()
    in (
      'true',
      '1',
      't',
    ),
    'password': os.getenv('REDIS_TOKEN', ''),
    'redis_max_stream_length': int(os.getenv('REDIS_MAX_STREAM_LENGTH', '360')),
  }

  services = Services(sc_params, slack_params, gh_params , redis_params)

  log_info('Starting HMPPS Component Dependencies script')
  try:
    dependency_info = get_dependency_info(services.redis)
  except Exception as e:
    log_error(f"An error occurred while fetching dependency info: {e}")
  order_components_by_total_dependencies(dependency_info,services)

if __name__ == '__main__':
  exit(main())
