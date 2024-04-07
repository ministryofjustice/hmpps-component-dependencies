import type { Dependency } from './data/Components'

const hostnameIncludes = (...values: string[]) => {
  const valuesToCheck = values.map(value => value.toLowerCase())
  return ({ dependencyHostname }: Dependency) => {
    const targetToCheck = dependencyHostname.toLowerCase()
    return valuesToCheck.some(value => targetToCheck?.includes(value))
  }
}

const typeIncludes = (...values: string[]) => {
  const valuesToCheck = values.map(value => value.toLowerCase())
  return ({ type }: Dependency) => {
    const typeToCheck = type.toLowerCase()
    return valuesToCheck.some(value => typeToCheck.includes(value))
  }
}

const awsResource = (...values: string[]) => {
  const isAws = hostnameIncludes('amazonaws.com')
  const isType = hostnameIncludes(...values)
  return (dependency: Dependency) => {
    return isAws(dependency) && isType(dependency)
  }
}

type Rule = (dependency: Dependency) => boolean
type Categorisation = [category: string, check: Rule]

const categories: Categorisation[] = [
  ['DB', typeIncludes('postgres', 'sql')],
  ['REDIS', typeIncludes('redis')],
  ['SNS', awsResource('sns')],
  ['SQS', awsResource('sqs')],
  ['STS', awsResource('sts')],
  ['S3', awsResource('s3')],
  ['DYNOMODB', awsResource('dynamodb')],
  ['OPENSEARCH', hostnameIncludes('opensearch')],
  ['GOTENBERG', hostnameIncludes('gotenberg')],
  ['SENTRY', hostnameIncludes('sentry.io')],
  ['HAZELCAST', hostnameIncludes('hazelcast.com')],
  ['GOOGLE_ANALYTICS', hostnameIncludes('www.google-analytics.com')],
  ['GOOGLE_APIS', hostnameIncludes('googleapis.com')],
  ['CONTENTFUL', hostnameIncludes('contentful.com')],
  ['ORDINANCE_SURVEY', hostnameIncludes('api.os.uk')],
  ['GOV_NOTIFY', hostnameIncludes('api.notifications.service.gov.uk')],
  ['MICROSOFT_LOGIN', hostnameIncludes('login.microsoftonline.com')],
  ['MICROSOFT_GRAPH', hostnameIncludes('graph.microsoft.com')],
  ['HTTP', typeIncludes('http', 'component')],
]

const categorise = (dependency: Dependency) => categories.find(category => category[1](dependency))?.[0] || dependency.type

export default categorise
