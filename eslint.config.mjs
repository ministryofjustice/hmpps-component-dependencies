// @ts-check
import hmppsConfig from '@ministryofjustice/eslint-config-hmpps'

export default [
  ...hmppsConfig({
    extraPathsAllowingDevDependencies: ['.allowed-scripts.mjs'],
  }),
  {
    rules: {
      'no-await-in-loop': 'off',
      'import/prefer-default-export': 'off',
    },
  },
]
