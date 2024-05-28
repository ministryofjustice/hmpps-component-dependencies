import { type AppInsightsCreds } from '../../config'
import { type Dependency } from '../Components'
import AppInsights from './Client'
import Queries from './queries'

export const sanitize = (s: string) => (s ? s.replace(':443', '').replace(/(.*?\.gov\.uk).*/, '$1') : '')

const getDependencies = async (appInsightsCreds: AppInsightsCreds): Promise<Dependency[]> => {
  const appInsights = new AppInsights(appInsightsCreds)
  const results = await appInsights.query(Queries.DEPENDENCIES())

  return results.rows.map(row => ({ componentName: row[0], dependencyHostname: sanitize(row[1]), type: row[2] }))
}

export default getDependencies
