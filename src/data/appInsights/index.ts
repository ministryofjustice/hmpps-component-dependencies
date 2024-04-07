import { type Environment } from '../../config'
import { Dependency } from '../ComponentInfo'
import AppInsights from './Client'
import Queries from './queries'

const getDependencies = async (env: Environment): Promise<Dependency[]> => {
  const appInsights = new AppInsights(env.appInsightsCreds)
  const results = await appInsights.query(Queries.DEPENDENCIES())

  return results.rows.map(row => ({ componentName: row[0], dependencyHostname: row[1], type: row[2] }))
}

export default getDependencies
