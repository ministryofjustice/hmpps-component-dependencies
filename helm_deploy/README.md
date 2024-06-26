# Deployment Notes

## Prerequisites

- Ensure you have helm v3 client installed.

```sh
$ helm version
version.BuildInfo{Version:"v3.0.1", GitCommit:"7c22ef9ce89e0ebeb7125ba2ebf7d421f3e82ffa", GitTreeState:"clean", GoVersion:"go1.13.4"}
```

- Ensure a TLS cert for your intended hostname is configured and ready, see section below.

### Useful helm (v3) commands:

__Test chart template rendering:__

This will out the fully rendered kubernetes resources in raw yaml.

```sh
helm template [path to chart] --values=values-dev.yaml
```

__List releases:__

```sh
helm --namespace [namespace] list
```

__List current and previously installed application versions:__

```sh
helm --namespace [namespace] history [release name]
```

__Rollback to previous version:__

```sh
helm --namespace [namespace] rollback [release name] [revision number] --wait
```

Note: replace _revision number_ with one from listed in the `history` command)

__Example deploy command:__

The following example is `--dry-run` mode - which will allow for testing.

```sh
helm upgrade [release name] [path to chart]. \
  --install --wait --force --reset-values --timeout 5m --history-max 10 \
  --dry-run \
  --namespace [namespace] \
  --values values-dev.yaml \
  --values example-secrets.yaml
```
