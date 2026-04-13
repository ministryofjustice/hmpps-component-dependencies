// @ts-check
import hmppsConfig from '@ministryofjustice/eslint-config-hmpps'

export default [
  ...hmppsConfig({
    extraPathsAllowingDevDependencies: ['.allowed-scripts.mjs'],
  }),
  {
    rules: {
      'import/prefer-default-export': 'off',
    },
  },
]
