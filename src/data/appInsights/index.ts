import { type AppInsightsCreds } from '../../config'
import { type Dependency, type MessagingConfig } from '../Components'
import AppInsights from './Client'
import Queries from './queries'

export const sanitize = (s: string) => (s ? s.replace(':443', '').replace(/(.*?\.gov\.uk).*/, '$1') : '')

const parseMessagingArray = (value: unknown): string[] => {
  if (value == null) {
    return []
  }

  if (Array.isArray(value)) {
    return value.flatMap(item => parseMessagingArray(item))
  }

  if (typeof value !== 'string') {
    return []
  }

  const trimmed = value.trim()
  if (!trimmed || trimmed === '[]') {
    return []
  }

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.map(item => `${item}`.trim()).filter(Boolean)
      }
    } catch {
      // Fall back to CSV parsing below if value is not valid JSON.
    }
  }

  return trimmed
    .split(',')
    .map(item => item.trim().replace(/^"|"$/g, ''))
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
