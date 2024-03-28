import { type Environment } from '../../config'
import AppInsights from './Client'
import Queries from './queries'

const getDependencies = async (env: Environment) => {
  const appInsights = new AppInsights(env.appInsightsCreds)
  return appInsights.query(Queries.DEPENDENCIES())
}

export default getDependencies
