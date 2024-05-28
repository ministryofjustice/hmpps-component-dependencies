import { sanitize } from '.'

describe('sanitise', () => {
  test('check removes :443', () => {
    expect(sanitize('approved-premises-api.hmpps.service.justice.gov.uk:443')).toStrictEqual('approved-premises-api.hmpps.service.justice.gov.uk')
  })

  test('check removes random suffix', () => {
    expect(sanitize('education-employment-api.hmpps.service.justice.gov.uk | aaaaaaa-eeee-dddd-ccccc-bbbbbbbb')).toStrictEqual(
      'education-employment-api.hmpps.service.justice.gov.uk',
    )
  })
})
