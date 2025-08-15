<!-- BEGIN GENERATED CONTENT -->
# List Webhooks

## General Information

- **Description:** List all the webhooks available for a base
- **Version:** 1.0.0
- **Group:** Webhooks
- **Scopes:** `webhook:manage`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_airtable_listwebhooks`
- **Input Model:** `ActionInput_airtable_listwebhooks`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/airtable/actions/list-webhooks.ts)


## Endpoint Reference

### Request Endpoint

`GET /webhooks`

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
      "expirationTime?": "<string>",
      "specification": {
        "options": {
          "filters": {
            "recordChangeScope?": "<string>",
            "dataTypes": "<string[]>",
            "changeTypes": "<string[]>",
            "fromSources": "<string[]>",
            "sourceOptions?": {
              "formPageSubmission?": {
                "pageId": "<string>"
              },
              "formSubmission?": {
                "viewId": "<string>"
              }
            },
            "watchDataInFieldIds": "<string[]>",
            "watchSchemasOfFieldIds": "<string[]>"
          },
          "includes?": {
            "includeCellValuesInFieldIds?": "<<string[]> | <string>>",
            "includePreviousCellValues:?": "<boolean>",
            "includePreviousFieldDefinitions?": "<boolean>"
          }
        }
      },
      "lastNotificationResult": "<{\"success\":\"<boolean>\",\"error?\":{\"message\":\"<string>\"},\"completionTimestamp?\":\"<string>\",\"durationMs?\":\"<number>\",\"retryNumber?\":\"<number>\",\"willBeRetried?\":\"<boolean>\"} | <null>>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/airtable/actions/list-webhooks.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/airtable/actions/list-webhooks.md)

<!-- END  GENERATED CONTENT -->

