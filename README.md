
# hmpps-component-dependencies

A recurring job that makes component runtime dependency information available for the developer portal

## why?

This supports the following use cases:

- It allows teams to easily see which components they would impact by changing their service
- It helps teams support identify root cause during outages

The benefit of using app insights for this is that it provides a live view of what the components actually call rather than having to rely on accuracy of health checks being present.

## what?

This builds up a graph of bidirectionally interconnected component nodes, performs some categorisation of the types of dependencies that are seen and then publises the information into a shared REDIS instance.

The developer portal then accesses this information and displays aggregated information against the component page.

## how?

It requires two sets of information:

1. Component information with environments
2. An App insights query to retrieve all unique dependencies for a given time range

The data is joined by linking:

- AppInsights `cloud_RoleName` to the `name` of the component
- AppInsights `target` to an environments `hostname`

This allows us to build a graph of each component to both it's dependencies and the things it depends on.

This graph can be navigated in both directions.

## and...

We could also use this linked dependency information to support:

- surfacing where people are missing health checks for their dependencies
- surfacing components that are not in the catalogue
  - (this includes a lot of probation integration components, some of which are used by prison services)

## Limitations

- This relies on the cloud role name matching the project name which may not be the case in all situations
  (Should be able to write something to narrow down where there is a mismatch)

- Requires components to be in the service catalogue!

- Only works for applications using AppInsights

- Needs some thorough testing
