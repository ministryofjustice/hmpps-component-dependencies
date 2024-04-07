import categorise from './dependency-categoriser'

describe('dependency categoriser', () => {
  test('http', () => {
    const category = categorise({ componentName: 'comp', type: 'http', dependencyHostname: 'somewhere' })
    expect(category).toStrictEqual('HTTP')
  })

  test('some random type', () => {
    const category = categorise({ componentName: 'comp', type: 'random', dependencyHostname: 'somewhere' })
    expect(category).toStrictEqual('random')
  })

  test('typeIncludes', () => {
    const category = categorise({ componentName: 'comp', type: 'POSTGRES', dependencyHostname: 'somewhere' })
    expect(category).toStrictEqual('DB')
  })

  test('hostnameIncludes', () => {
    const category = categorise({ componentName: 'comp', type: 'http', dependencyHostname: 'some.gotenberg.com' })
    expect(category).toStrictEqual('GOTENBERG')
  })

  test('awsService', () => {
    const category = categorise({ componentName: 'comp', type: 'http', dependencyHostname: 'some.dynamodb.amazonaws.com:123' })
    expect(category).toStrictEqual('DYNOMODB')
  })
})
