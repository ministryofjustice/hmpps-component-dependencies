import { AgentConfig } from '@ministryofjustice/hmpps-rest-client'

export enum EnvType {
  PROD = 'PROD',
  PREPROD = 'PREPROD',
  DEV = 'DEV',
}

export type AppInsightsCreds = { appId: string; appKey: string }

export type Environment = { env: EnvType; appInsightsCreds: AppInsightsCreds }

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
  serviceCatalogue: {
    url: get<string>('SERVICE_CATALOGUE_URL', 'https://mock-service-catalogue'),
    timeout: {
      deadline: parseInt(process.env.SC_DEADLINE, 10) || 5000,
      response: parseInt(process.env.SC_RESPONSE, 10) || 10000,
    },
    agent: new AgentConfig(10000),
    token: get<string>('SERVICE_CATALOGUE_TOKEN', 'mock-service-catalogue-token'),
  },
  redis: {
    host: get('REDIS_HOST', 'localhost'),
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_AUTH_TOKEN,
    tlsEnabled: get('REDIS_TLS_ENABLED', 'false'),
    tlsVerification: get('REDIS_TLS_VERIFICATION', 'true'),
  },
  environments: [
    {
      env: EnvType.DEV,
      appInsightsCreds: {
        appId: get('DEV_APPINSIGHTS_ID', 'mock-app-insights-id'),
        appKey: get('DEV_APPINSIGHTS_KEY', 'mock-app-insights-key'),
      },
    },
    {
      env: EnvType.PREPROD,
      appInsightsCreds: {
        appId: get('PREPROD_APPINSIGHTS_ID', 'mock-app-insights-id'),
        appKey: get('PREPROD_APPINSIGHTS_KEY', 'mock-app-insights-key'),
      },
    },
    {
      env: EnvType.PROD,
      appInsightsCreds: {
        appId: get('PROD_APPINSIGHTS_ID', 'mock-app-insights-id'),
        appKey: get('PROD_APPINSIGHTS_KEY', 'mock-app-insights-key'),
      },
    },
  ] as Environment[],
}

export default config
