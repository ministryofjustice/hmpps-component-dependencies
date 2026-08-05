import { RestClient } from '@ministryofjustice/hmpps-rest-client'
import { type AppInsightsCreds } from '../../config'
import config from '../../config'
import logger from '../../utils/logger'

type QueryResult = {
  headers: string[]
  rows: string[][]
}

type QueryApiResponse = {
  tables: {
    columns: { name: string }[]
    rows: string[][]
  }[]
}

export default class AppInsights extends RestClient {
  appId: string

  appKey: string

  constructor(creds: AppInsightsCreds) {
    super('app-insights-api', config.appInsightsApi, logger)
    this.appId = creds.appId
    this.appKey = creds.appKey
  }

  async query(query: string): Promise<QueryResult> {
    const response = await this.post<QueryApiResponse>(
      {
        path: `/v1/apps/${this.appId}/query`,
        headers: {
          'X-Api-Key': this.appKey,
          Accept: 'application/json',
        },
        data: { query },
      },
      undefined,
    )

    const firstTable = response?.tables?.[0]
    if (!firstTable) {
      return { headers: [], rows: [] }
    }

    return {
      headers: firstTable.columns.map(column => column.name),
      rows: firstTable.rows,
    }
  }
}
