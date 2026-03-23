import { type AppInsightsCreds } from '../../config'
import { type Dependency, type MessagingConfig } from '../Components'
import AppInsights from './Client'
import Queries from './queries'

export const sanitize = (s: string) => (s ? s.replace(':443', '').replace(/(.*?\.gov\.uk).*/, '$1') : '')

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
    inbound_queue: Array.isArray(row[1]) ? row[1] : row[1]?.split(',') || [],
    topic_queue: Array.isArray(row[2]) ? row[2] : row[2]?.split(',') || [],
    outbound_queue: Array.isArray(row[3]) ? row[3] : row[3]?.split(',') || [],
  }))
}

const appInsightsService = {
  getDependencies,
  getMessagingConfig,
}

export default appInsightsService
