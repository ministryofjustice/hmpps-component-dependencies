import { setup, defaultClient, TelemetryClient, DistributedTracingModes } from 'applicationinsights'
import type { ApplicationInfo } from './applicationInfo'

export default function initialiseAppInsights({ applicationName, buildNumber }: ApplicationInfo): TelemetryClient {
  if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
    // eslint-disable-next-line no-console
    console.log('Enabling azure application insights')

    setup().setDistributedTracingMode(DistributedTracingModes.AI_AND_W3C).start()
    defaultClient.context.tags['ai.cloud.role'] = applicationName
    defaultClient.context.tags['ai.application.ver'] = buildNumber
    return defaultClient
  }
  return null
}
