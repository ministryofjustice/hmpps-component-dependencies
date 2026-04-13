import { type AppInsightsCreds } from '../../config'
import { parseMessagingArray } from '../../utils/arrayParsing'
import { sanitiseHostname } from '../../utils/hostnameSanitising'
import { type Dependency, type MessagingInfo } from '../Components'
import AppInsights from './Client'
import Queries from './queries'

export class AppInsightsService {
  constructor(private readonly appInsights: AppInsights) {}

  async getDependencies(): Promise<Dependency[]> {
    const results = await this.appInsights.query(Queries.DEPENDENCIES())
    if (!results || !results.rows) {
      return []
    }
    return results.rows.map(row => ({
      componentName: row[0],
      dependencyHostname: sanitiseHostname(row[1]),
      type: row[2],
    }))
  }

  async getMessagingInfo(): Promise<MessagingInfo[]> {
    const results = await this.appInsights.query(Queries.MessagingInfo())
    if (!results || !results.rows) {
      return []
    }
    return results.rows.map(row => ({
      componentName: row[0],
      inboundSqsQueues: parseMessagingArray(row[1]),
      outboundSnsTopics: parseMessagingArray(row[2]),
      outboundSqsQueues: parseMessagingArray(row[3]),
    }))
  }
}

export const AppInsightsServiceFactory = (appInsightsCreds: AppInsightsCreds) =>
  new AppInsightsService(new AppInsights(appInsightsCreds))
export type AppInsightsServiceFactory = typeof AppInsightsServiceFactory
