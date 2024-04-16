import { type AppInsightsCreds } from '../../config'
import { type Dependency } from '../Components'
import AppInsights from './Client'
import Queries from './queries'

const getDependencies = async (appInsightsCreds: AppInsightsCreds): Promise<Dependency[]> => {
  const appInsights = new AppInsights(appInsightsCreds)
  const results = await appInsights.query(Queries.DEPENDENCIES())

  return results.rows.map(row => ({ componentName: row[0], dependencyHostname: row[1], type: row[2] }))
}

export default getDependencies
