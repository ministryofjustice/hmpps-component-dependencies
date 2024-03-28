export type AppInsightsCreds = { appId: string; appKey: string }

export type Environment = {
  appInsightsCreds: AppInsightsCreds
}

const envString = (name: string): string => {
  const value = process.env[name]
  if (!value || typeof value !== 'string') throw Error(`Missing env var: ${name}`)
  return value
}

const config = {
  environments: {
    dev: {
      appInsightsCreds: {
        appId: envString('DEV_APPINSIGHTS_ID'),
        appKey: envString('DEV_APPINSIGHTS_KEY'),
      },
    } as Environment,
    preprod: {
      appInsightsCreds: {
        appId: envString('PREPROD_APPINSIGHTS_ID'),
        appKey: envString('PREPROD_APPINSIGHTS_KEY'),
      },
    } as Environment,
    prod: {
      appInsightsCreds: {
        appId: envString('PROD_APPINSIGHTS_ID'),
        appKey: envString('PROD_APPINSIGHTS_KEY'),
      },
    } as Environment,
  },
}

export default config
