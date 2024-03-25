import type { Dependency } from "./data-sources";

const targetIncludes = (...values: string[]) => {
  const valuesToCheck = values.map((value) => value.toLowerCase());
  return ([, target]: Dependency) => {
    const targetToCheck = target?.toLowerCase();
    return valuesToCheck.some((value) => targetToCheck?.includes(value));
  };
};

const typeIncludes = (...values: string[]) => {
  const valuesToCheck = values.map((value) => value.toLowerCase());
  return ([, , type]: Dependency) => {
    const typeToCheck = type.toLowerCase();
    return valuesToCheck.some((value) => typeToCheck.includes(value));
  };
};

const awsResource = (...values: string[]) => {
  const isAws = targetIncludes("amazonaws.com");
  const isType = targetIncludes(...values);
  return (dependency: Dependency) => {
    return isAws(dependency) && isType(dependency);
  };
};

type Rule = (dependency: Dependency) => boolean;
type Categorisation = [category: string, check: Rule];

const categories: Categorisation[] = [
  ["DB", typeIncludes("postgres", "sql")],
  ["REDIS", typeIncludes("redis")],
  ["SNS", awsResource("sns")],
  ["SQS", awsResource("sqs")],
  ["STS", awsResource("sts")],
  ["S3", awsResource("s3")],
  ["DYNOMODB", awsResource("dynamodb")],
  ["OPENSEARCH", targetIncludes("opensearch")],
  ["GOTENBERG", targetIncludes("gotenberg")],
  ["SENTRY", targetIncludes("sentry.io")],
  ["HAZELCAST", targetIncludes("hazelcast.com")],
  ["GOOGLE_ANALYTICS", targetIncludes("www.google-analytics.com")],
  ["GOOGLE_APIS", targetIncludes("googleapis.com")],
  ["CONTENTFUL", targetIncludes("contentful.com")],
  ["ORDINANCE_SURVEY", targetIncludes("api.os.uk")],
  ["GOV_NOTIFY", targetIncludes("api.notifications.service.gov.uk")],
  ["MICROSOFT_LOGIN", targetIncludes("login.microsoftonline.com")],
  ["MICROSOFT_GRAPH", targetIncludes("graph.microsoft.com")],
  ["HTTP", typeIncludes("http", "component")],
];

export const categorise = (dependency: Dependency) =>
  categories.find((category) => category[1](dependency))?.[0] || dependency[2];
