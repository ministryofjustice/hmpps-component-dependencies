{{/* vim: set filetype=mustache: */}}
{{/*
Environment variables for web and worker containers
*/}}
{{- define "deployment.envs" -}}
env:
  - name: APPLICATIONINSIGHTS_CONNECTION_STRING
    valueFrom:
      secretKeyRef:
        name: {{ template "app.name" . }}
        key: APPLICATIONINSIGHTS_CONNECTION_STRING

{{range .Values.appinsightEnvs }}
  - name: {{ . }}_APPINSIGHTS_ID
    valueFrom:
      secretKeyRef:
        name: {{ template "app.name" $ }}
        key: {{ . }}_APPINSIGHTS_ID

  - name: {{ . }}_APPINSIGHTS_KEY
    valueFrom:
      secretKeyRef:
        name: {{ template "app.name" $ }}
        key: {{ . }}_APPINSIGHTS_KEY
{{ end }}  
  - name: SERVICE_CATALOGUE_URL
    value: {{ .Values.apis.serviceCatalogue.url | quote }}

  - name: SERVICE_CATALOGUE_TOKEN
    valueFrom:
      secretKeyRef:
        name: {{ template "app.name" $ }}
        key: SERVICE_CATALOGUE_TOKEN

  - name: REDIS_HOST
    valueFrom:
      secretKeyRef:
        name: {{ .Values.redis.secretName}}
        key: primary_endpoint_address

  - name: REDIS_AUTH_TOKEN
    valueFrom:
      secretKeyRef:
        name: {{ .Values.redis.secretName}}
        key: auth_token

  - name: REDIS_TLS_ENABLED
    value: "true"

  - name: REDIS_TLS_VERIFICATION
    value: "true"
    
  - name: PRODUCT_ID
    value: "DPS000"

{{end -}}
