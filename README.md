
# hmpps-component-dependencies
POC to look into surfacing app insight dependencies for the developer portal

## why?

This is a proof of component to show how we can expose dependency information about components by combining data from the service catalogue and app insights.

This supports at least the following use cases:

- It allows teams to easily see which components they would impact by changing their service
- It helps teams support identify root cause during outages

The benefit of using app insights for this is that it provides a live view of what the components actually call rather than having to rely on accuracy of health checks being present.

## what?

This builds up a graph of bidirectionally interconnected component nodes.

This graph can be navigated in both directions, to view a components dependencies and also the things that rely on it. 

Components can be retrieved by name and then the following 4 functions are available:

### `getDependencies`

This returns a list of all of the components that this component relies on.
So for example: `create-and-vary-a-licence-api` relies on the following components:

```js
[
  "hmpps-auth",
  "hmpps-external-users-api",
  "hmpps-manage-users-api",
  "hmpps-prisoner-search",
  "nomis-user-roles-api",
  "prison-api",
  "probation-offender-search",
];
```

Note: there is no direct link between CVL API and `nomis-user-roles` but the function works recursively to provide info about transitive dependencies.

### `getDependencyPaths`

This returns a list of all of the possible dependencies and how they are related.
For CVL API example:

```js
[
'create-and-vary-a-licence-api => prison-api => hmpps-auth => hmpps-manage-users-api => hmpps-external-users-api',
...
'create-and-vary-a-licence-api => hmpps-prisoner-search => hmpps-auth => nomis-user-roles-api => *INF* (hmpps-auth)',
...
]
```

This shows two paths, the first example shows the chain of dependencies to demonstrate how `create-and-vary-a-licence-api` relies on `hmpps-external-users-api`.

The second path demonstrates how it handles the bidrectional dependency between `hmpps-auth` and `nomis-user-roles-api` using the arbitrary syntax: `*INF* (component-name)`.

### `getDependents`

This returns a list of all of the components that rely on this component (either directly or transitively).
For CVL, the list looks like this:

```js
[
  "create-and-vary-a-licence",
  "create-and-vary-a-licence-activate-licences-job",
  "create-and-vary-a-licence-email-probation-practioner-job",
  "create-and-vary-a-licence-remove-ap-conditions-job",
  "hmpps-resettlement-passport-api",
  "hmpps-resettlement-passport-ui",
  "make-recall-decision-api",
  "make-recall-decision-ui",
  "make-recall-decisions-and-delius",
];
```

So, the frontend, some jobs and a few external clients including some integrating services.

### `getDependentPaths`

This returns the path information for the component above:

For CVL API:

```js
[
  "create-and-vary-a-licence-api => make-recall-decision-api => make-recall-decision-ui",
  "create-and-vary-a-licence-api => make-recall-decision-api => make-recall-decisions-and-delius",
  "create-and-vary-a-licence-api => hmpps-resettlement-passport-api => hmpps-resettlement-passport-ui",
  "create-and-vary-a-licence-api => create-and-vary-a-licence",
  "create-and-vary-a-licence-api => create-and-vary-a-licence-activate-licences-job",
  "create-and-vary-a-licence-api => create-and-vary-a-licence-email-probation-practioner-job",
  "create-and-vary-a-licence-api => create-and-vary-a-licence-remove-ap-conditions-job",
];
```

We can see that if CVL went down it could transitively impact the `make-recall-decisions-and-delius` component.

NB: For components with lots of dependencies, this list can be very large as there are possible multiple reasons (paths) why it being down could affect a component. For instance, as well as CVL directly relying on `hmpps-auth`, CVL could go down because it relies on `prison-api` which also relies on `hmpps-auth`. This creates a bit of a combinatorial explosion: >900 paths.

## how?

It requires two sets of information:

1. Component information with environments
2. An App insights query to retrieve all unique dependencies for a given time range

(example curl/AppInsights queries can be found in `data-sources.ts`)

The data is joined by linking:
* AppInsights `cloud_RoleName` to the `name` of the component
* AppInsights `target` to an environments `hostname`

How this would this would be integrated into the component dashboard would require a bit of a conversation.

Potentially a node service/job that would semi regularly to gather the data and push the dependency info into redis or the service catalogue. Or we could push in the raw data and build up the dependency info on the fly on the frontend.

## and...

We could also use this linked dependency information to support:

- surfacing where people are missing health checks for their dependencies
- surfacing components that are not in the catalogue
  - (this includes a lot of probation integration components, some of which are used by prison services)
- surfacing AWS dependencies - use of queues, topics, RDS, redis

## Limitations

* This relies on the cloud role name matching the project name which may not be the case in all situations
(Should be able to write something to narrow down where there is a mismatch)

* Requires components to be in the service catalogue!

* Only works for applications using AppInsights

* Needs some thorough testing
