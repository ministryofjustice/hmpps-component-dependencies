import { sanitiseHostname } from './hostnameSanitising'

describe('sanitise', () => {
  test('check removes :443', () => {
    expect(sanitiseHostname('approved-premises-api.hmpps.service.justice.gov.uk:443')).toStrictEqual(
      'approved-premises-api.hmpps.service.justice.gov.uk',
    )
  })

  test('check does not remove other ports', () => {
    expect(sanitiseHostname('example:4435')).toStrictEqual('example:4435')
  })

  test('check removes random suffix', () => {
    expect(
      sanitiseHostname('education-employment-api.hmpps.service.justice.gov.uk | aaaaaaa-eeee-dddd-ccccc-bbbbbbbb'),
    ).toStrictEqual('education-employment-api.hmpps.service.justice.gov.uk')
  })
})
