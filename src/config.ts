export type AppInsightsCreds = { appId: string; appKey: string }

export type Environment = {
  appInsightsCreds: AppInsightsCreds
}

const production = process.env.NODE_ENV === 'production'

function get<T>(name: string, fallback: T = undefined): T | string {
  if (process.env[name]) {
    return process.env[name]
  }
  if (fallback !== undefined && !production) {
    return fallback
  }
  throw new Error(`Missing env var ${name}`)
}

const config = {
  production,
  buildNumber: get('BUILD_NUMBER', '1_0_0'),
  productId: get('PRODUCT_ID', 'MISSING'),
  gitRef: get('GIT_REF', 'xxxxxxxxxxxxxxxxxxx'),
  branchName: get('GIT_BRANCH', 'xxxxxxxxxxxxxxxxxxx'),
  serviceCatalogueUrl: get<string>('SERVICE_CATALOGUE_URL'),
  redis: {
    host: get('REDIS_HOST', 'localhost'),
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_AUTH_TOKEN,
    tlsEnabled: get('REDIS_TLS_ENABLED', 'false'),
    tlsVerification: get('REDIS_TLS_VERIFICATION', 'true'),
  },
  environments: {
    dev: {
      appInsightsCreds: {
        appId: get('DEV_APPINSIGHTS_ID'),
        appKey: get('DEV_APPINSIGHTS_KEY'),
      },
    } as Environment,
    // preprod: {
    //   appInsightsCreds: {
    //     appId: get('PREPROD_APPINSIGHTS_ID'),
    //     appKey: get('PREPROD_APPINSIGHTS_KEY'),
    //   },
    // } as Environment,
    // prod: {
    //   appInsightsCreds: {
    //     appId: get('PROD_APPINSIGHTS_ID'),
    //     appKey: get('PROD_APPINSIGHTS_KEY'),
    //   },
    // } as Environment,
  },
}

export default config
