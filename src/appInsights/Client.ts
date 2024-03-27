import superagent from "superagent";

type Row = any[]

type QueryResult = {
  headers: string[]
  rows: Row[]
}

export class AppInsights {
  appId: string;
  appKey: string;

  constructor(appId: string, appKey: string) {
    this.appId = appId;
    this.appKey = appKey;
  }

  async query(query: string): Promise<QueryResult> {
    return superagent
      .post(`https://api.applicationinsights.io/v1/apps/${this.appId}/query`)
      .send({ query })
      .set("X-Api-Key", this.appKey)
      .set("Accept", "application/json")
      .then(res => res.body)
      .then(({ tables: [{ columns, rows }] }) => ({
        columns: columns as [{name: string}],
        rows
      }))
      .then(({ columns, rows }) => ({
        headers: columns.map(column => column.name),
        rows
      }));
  }
}
