import { ClientClosedError } from 'redis'
import logger from '../../utils/logger'
import { RedisClient } from './redisClient'

type Data = Parameters<RedisClient['json']['set']>[2]

export default class RedisService {
  constructor(private readonly redisClient: RedisClient) {}

  async write(data: Data): Promise<void> {
    try {
      await this.redisClient.json.set('dependency:info', '$', data)
    } catch (error) {
      if (error instanceof ClientClosedError) {
        logger.error(`${error.message} ...RECONNECTING`)
        await this.redisClient.connect
        return
      }
      logger.error(`Failed to json.set: ${error.message}`, error)
    }
  }
}
