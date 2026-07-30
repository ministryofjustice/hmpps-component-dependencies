import superagent from 'superagent'
import { type AppInsightsCreds } from '../../config'

type QueryResult = {
  headers: string[]
  rows: string[][]
}

export default class AppInsights {
  appId: string

  appKey: string

  private proxyAgent: unknown

  private proxyAgentInitialised = false

  constructor(creds: AppInsightsCreds) {
    this.appId = creds.appId
    this.appKey = creds.appKey
  }

  private async getProxyAgent(): Promise<unknown> {
    if (this.proxyAgentInitialised) {
      return this.proxyAgent
    }

    this.proxyAgentInitialised = true
    const { ProxyAgent } = await import('proxy-agent')
    this.proxyAgent = new ProxyAgent()
    return this.proxyAgent
  }

  async query(query: string): Promise<QueryResult> {
    const proxyAgent = await this.getProxyAgent()

    return superagent
      .post(`https://api.applicationinsights.io/v1/apps/${this.appId}/query`)
      .agent(proxyAgent as never)
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
