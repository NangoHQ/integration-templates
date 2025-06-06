<!-- BEGIN GENERATED CONTENT -->
# Create Webhook

## General Information

- **Description:** Create a webhook for a particular base
- **Version:** 1.0.0
- **Group:** Webhooks
- **Scopes:** `webhook:manage`
- **Endpoint Type:** Action
- **Model:** `WebhookCreated`
- **Input Model:** `CreateWebhook`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/airtable/actions/create-webhook.ts)


## Endpoint Reference

### Request Endpoint

`POST /webhooks`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "baseId": "<string>",
  "specification": {
    "options": {
      "filters": {
        "recordChangeScope?": "<string>",
        "dataTypes": [
          "<string>"
        ],
        "changeTypes?": [
          "<string>"
        ],
        "fromSources?": [
          "<string>"
        ],
        "sourceOptions?": {
          "formPageSubmission?": {
            "pageId": "<string>"
          },
          "formSubmission?": {
            "viewId": "<string>"
          }
        },
        "watchDataInFieldIds?": [
          "<string>"
        ],
        "watchSchemasOfFieldIds?": [
          "<string>"
        ]
      },
      "includes?": {
        "includeCellValuesInFieldIds?": "<string[] | all>",
        "includePreviousCellValues:?": "<boolean>",
        "includePreviousFieldDefinitions?": "<boolean>"
      }
    }
  }
}
```

### Request Response

```json
{
  "id": "<string>",
  "expirationTime": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/airtable/actions/create-webhook.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/airtable/actions/create-webhook.md)

<!-- END  GENERATED CONTENT -->

