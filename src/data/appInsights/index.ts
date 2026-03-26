import { type AppInsightsCreds } from '../../config'
import { type Dependency, type MessagingConfig } from '../Components'
import AppInsights from './Client'
import Queries from './queries'

export const sanitize = (s: string) => (s ? s.replace(':443', '').replace(/(.*?\.gov\.uk).*/, '$1') : '')

/**
 * Parses comma-separated values from AppInsights query response into array format.
 * Handles null/empty values and returns as JSON-serializable array.
 *
 * @param value - Comma-separated string value from query (e.g., "queue1,queue2,queue3")
 * @returns Array of string values, empty array if null/empty
 */
export const parseMessagingArray = (value: unknown): string[] => {
  // Handle null/undefined - return empty array
  if (value == null) {
    return []
  }

  // If already an array, return as-is
  if (Array.isArray(value)) {
    return value
  }

  // Convert to string and parse
  const str = String(value).trim()

  // Handle empty or null string
  if (!str) {
    return []
  }

  // Split by comma, trim each value, remove empty strings
  return str
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

const getDependencies = async (appInsightsCreds: AppInsightsCreds): Promise<Dependency[]> => {
  const appInsights = new AppInsights(appInsightsCreds)
  const results = await appInsights.query(Queries.DEPENDENCIES())

  return results.rows.map(row => ({ componentName: row[0], dependencyHostname: sanitize(row[1]), type: row[2] }))
}

const getMessagingConfig = async (appInsightsCreds: AppInsightsCreds): Promise<MessagingConfig[]> => {
  const appInsights = new AppInsights(appInsightsCreds)
  const results = await appInsights.query(Queries.MessagingConfig())

  return results.rows.map(row => ({
    componentName: row[0],
    inbound_sqs_queues: parseMessagingArray(row[1]),
    outbound_sns_topics: parseMessagingArray(row[2]),
    outbound_sqs_queues: parseMessagingArray(row[3]),
  }))
}

const appInsightsService = {
  getDependencies,
  getMessagingConfig,
}

export default appInsightsService
