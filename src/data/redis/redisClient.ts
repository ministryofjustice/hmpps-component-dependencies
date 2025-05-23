import { createClient } from 'redis'
import config from '../../config'
import logger from '../../utils/logger'

export type RedisClient = ReturnType<typeof createClient>

const url =
  config.redis.tlsEnabled === 'true'
    ? `rediss://${config.redis.host}:${config.redis.port}`
    : `redis://${config.redis.host}:${config.redis.port}`

const tlsVerification = config.redis.tlsVerification === 'true'

export const createRedisClient = (): RedisClient => {
  const client = createClient({
    url,
    password: config.redis.password,
    socket: {
      rejectUnauthorized: tlsVerification,
      reconnectStrategy: (attempts: number) => {
        // Exponential back off: 20ms, 40ms, 80ms..., capped to retry every 30 seconds
        const nextDelay = Math.min(2 ** attempts * 20, 30000)
        logger.info(`Retry Redis connection attempt: ${attempts}, next attempt in: ${nextDelay}ms`)
        return nextDelay
      },
    },
  })

  client.on('error', (e: Error) => logger.error('Redis client error', e))

  return client
}
