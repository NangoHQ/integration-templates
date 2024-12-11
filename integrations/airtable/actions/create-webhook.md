# Create Webhook

## General Information

- **Description:** Create a webhook for a particular base
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `webhook:manage`
- **Endpoint Type:** Action
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

