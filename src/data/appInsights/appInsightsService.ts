import { type AppInsightsCreds } from '../../config'
import { parseMessagingArray } from '../../utils/arrayParsing'
import { sanitiseHostname } from '../../utils/hostnameSanitising'
import { type Dependency, type MessagingConfig } from '../Components'
import AppInsights from './Client'
import Queries from './queries'

export class AppInsightsService {
  constructor(private readonly appInsights: AppInsights) {}

  async getDependencies(): Promise<Dependency[]> {
    const results = await this.appInsights.query(Queries.DEPENDENCIES())

    return results.rows.map(row => ({
      componentName: row[0],
      dependencyHostname: sanitiseHostname(row[1]),
      type: row[2],
    }))
  }

  async getMessagingConfig(): Promise<MessagingConfig[]> {
    const results = await this.appInsights.query(Queries.MessagingConfig())

    return results.rows.map(row => ({
      componentName: row[0],
      inbound_sqs_queues: parseMessagingArray(row[1]),
      outbound_sns_topics: parseMessagingArray(row[2]),
      outbound_sqs_queues: parseMessagingArray(row[3]),
    }))
  }
}

export const AppInsightsServiceFactory = (appInsightsCreds: AppInsightsCreds) =>
  new AppInsightsService(new AppInsights(appInsightsCreds))
export type AppInsightsServiceFactory = typeof AppInsightsServiceFactory
