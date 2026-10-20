import { configureAllowedScripts } from '@ministryofjustice/hmpps-npm-script-allowlist'

export default configureAllowedScripts({
  allowlist: {
    'node_modules/@parcel/watcher@2.6.0': 'ALLOW',
    'node_modules/dtrace-provider@0.8.8': 'ALLOW',
    'node_modules/protobufjs@7.6.6': 'ALLOW',
    'node_modules/unrs-resolver@1.12.2': 'ALLOW',
  },
})
