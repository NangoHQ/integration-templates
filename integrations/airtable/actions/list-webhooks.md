# List Webhooks

## General Information

- **Description:** List all the webhooks available for a base
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: webhook:manage
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/airtable/actions/list-webhooks.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/webhooks`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "baseId": "<string>"
}
```

### Request Response

```json
{
  "webhooks": [
    {
      "id": "<string>",
      "areNotificationsEnabled": "<boolean>",
      "cursorForNextPayload": "<number>",
      "isHookEnabled": "<boolean>",
      "lastSuccessfulNotificationTime": "<string | null>",
      "expirationTime?": "<string | undefined>",
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
      },
      "lastNotificationResult": "<NotificationResult | null>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/airtable/actions/list-webhooks.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/airtable/actions/list-webhooks.md)

<!-- END  GENERATED CONTENT -->















