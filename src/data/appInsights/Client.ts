import superagent from 'superagent'
import { type AppInsightsCreds } from '../../config'

type QueryResult = {
  headers: string[]
  rows: string[][]
}

export default class AppInsights {
  appId: string

  appKey: string

  constructor(creds: AppInsightsCreds) {
    this.appId = creds.appId
    this.appKey = creds.appKey
  }

  async query(query: string): Promise<QueryResult> {
    return superagent
      .post(`https://api.applicationinsights.io/v1/apps/${this.appId}/query`)
      .send({ query })
      .set('X-Api-Key', this.appKey)
      .set('Accept', 'application/json')
      .then(res => res.body)
      .then(({ tables: [{ columns, rows }] }) => ({
        columns: columns as [{ name: string }],
        rows,
      }))
      .then(({ columns, rows }) => ({
        headers: columns.map(column => column.name),
        rows,
      }))
  }
}
