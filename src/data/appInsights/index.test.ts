import { sanitize, parseMessagingArray } from '.'

describe('sanitise', () => {
  test('check removes :443', () => {
    expect(sanitize('approved-premises-api.hmpps.service.justice.gov.uk:443')).toStrictEqual(
      'approved-premises-api.hmpps.service.justice.gov.uk',
    )
  })

  test('check removes random suffix', () => {
    expect(
      sanitize('education-employment-api.hmpps.service.justice.gov.uk | aaaaaaa-eeee-dddd-ccccc-bbbbbbbb'),
    ).toStrictEqual('education-employment-api.hmpps.service.justice.gov.uk')
  })
})

describe('parseMessagingArray', () => {
  describe('null and undefined handling', () => {
    test('should return empty array for null', () => {
      expect(parseMessagingArray(null)).toStrictEqual([])
    })

    test('should return empty array for undefined', () => {
      expect(parseMessagingArray(undefined)).toStrictEqual([])
    })
  })

  describe('array input handling', () => {
    test('should return array as-is for valid array input', () => {
      const input = ['queue1', 'queue2']
      expect(parseMessagingArray(input)).toStrictEqual(input)
    })

    test('should return empty array for empty array input', () => {
      expect(parseMessagingArray([])).toStrictEqual([])
    })

    test('should handle array with multiple items', () => {
      const input = ['sqs-queue-1', 'sqs-queue-2', 'sqs-queue-3']
      expect(parseMessagingArray(input)).toStrictEqual(input)
    })
  })

  describe('comma-separated string format (query output)', () => {
    test('should parse comma-separated query result', () => {
      const input = 'arn:aws:sqs:eu-west-1:123456789:queue1,arn:aws:sqs:eu-west-1:123456789:queue2'
      expect(parseMessagingArray(input)).toStrictEqual([
        'arn:aws:sqs:eu-west-1:123456789:queue1',
        'arn:aws:sqs:eu-west-1:123456789:queue2',
      ])
    })

    test('should parse single comma-separated value', () => {
      const input = 'arn:aws:sqs:eu-west-1:123456789:single-queue'
      expect(parseMessagingArray(input)).toStrictEqual(['arn:aws:sqs:eu-west-1:123456789:single-queue'])
    })

    test('should trim whitespace around comma-separated values', () => {
      const input = 'queue1 , queue2 , queue3'
      expect(parseMessagingArray(input)).toStrictEqual(['queue1', 'queue2', 'queue3'])
    })

    test('should filter out empty values', () => {
      const input = 'queue1,,queue2'
      expect(parseMessagingArray(input)).toStrictEqual(['queue1', 'queue2'])
    })

    test('should handle trailing/leading commas', () => {
      const input = ',queue1,queue2,'
      expect(parseMessagingArray(input)).toStrictEqual(['queue1', 'queue2'])
    })

    test('should handle whitespace-only values between commas', () => {
      const input = 'queue1, , queue2'
      expect(parseMessagingArray(input)).toStrictEqual(['queue1', 'queue2'])
    })
  })

  describe('empty string handling', () => {
    test('should return empty array for empty string', () => {
      expect(parseMessagingArray('')).toStrictEqual([])
    })

    test('should return empty array for whitespace-only string', () => {
      expect(parseMessagingArray('   ')).toStrictEqual([])
    })
  })

  describe('real-world AppInsights query shapes', () => {
    test('should parse SNS topic ARNs from query', () => {
      const input = 'arn:aws:sns:eu-west-1:123456789:topic-name,arn:aws:sns:eu-west-1:123456789:another-topic'
      expect(parseMessagingArray(input)).toStrictEqual([
        'arn:aws:sns:eu-west-1:123456789:topic-name',
        'arn:aws:sns:eu-west-1:123456789:another-topic',
      ])
    })

    test('should parse SQS queue URLs from query', () => {
      const input =
        'https://sqs.eu-west-1.amazonaws.com/123456789/queue1,https://sqs.eu-west-1.amazonaws.com/123456789/queue2'
      expect(parseMessagingArray(input)).toStrictEqual([
        'https://sqs.eu-west-1.amazonaws.com/123456789/queue1',
        'https://sqs.eu-west-1.amazonaws.com/123456789/queue2',
      ])
    })

    test('should handle single SQS queue in result', () => {
      const input = 'https://sqs.eu-west-1.amazonaws.com/123456789/single-queue'
      expect(parseMessagingArray(input)).toStrictEqual(['https://sqs.eu-west-1.amazonaws.com/123456789/single-queue'])
    })

    test('should return as JSON-serializable array format', () => {
      const input = 'messaging-service-1,messaging-service-2'
      const result = parseMessagingArray(input)
      const jsonString = JSON.stringify(result)
      expect(jsonString).toBe('["messaging-service-1","messaging-service-2"]')
    })

    test('should preserve complex ARNs with colons and dashes', () => {
      const input = 'arn:aws:sqs:eu-west-1:123456789:my-queue-name,arn:aws:sqs:eu-west-1:123456789:another-queue-name'
      const result = parseMessagingArray(input)
      expect(result.length).toBe(2)
      expect(result[0]).toContain('my-queue-name')
      expect(result[1]).toContain('another-queue-name')
    })
  })

  describe('type conversion', () => {
    test('should convert number to string and parse', () => {
      const result = parseMessagingArray(12345)
      expect(result).toStrictEqual(['12345'])
    })

    test('should convert boolean to string', () => {
      const result = parseMessagingArray(true)
      expect(result).toStrictEqual(['true'])
    })
  })

  describe('backward compatibility', () => {
    test('should maintain compatibility with previous messaging config format', () => {
      const sqs = 'queue-1,queue-2,queue-3'
      const sns = 'topic-1,topic-2'
      const source = 'source-service-1,source-service-2'

      expect(parseMessagingArray(sqs)).toStrictEqual(['queue-1', 'queue-2', 'queue-3'])
      expect(parseMessagingArray(sns)).toStrictEqual(['topic-1', 'topic-2'])
      expect(parseMessagingArray(source)).toStrictEqual(['source-service-1', 'source-service-2'])
    })

    test('should handle null gracefully for optional messaging config fields', () => {
      expect(parseMessagingArray(null)).toStrictEqual([])
      expect(parseMessagingArray(undefined)).toStrictEqual([])
    })
  })
})
