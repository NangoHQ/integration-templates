<!-- BEGIN GENERATED CONTENT -->
# Fetch Properties

## General Information

- **Description:** Fetch the properties of a specified object
- **Version:** 0.0.1
- **Group:** Properties
- **Scopes:** `oauth, media_bridge.read, crm.objects.marketing_events.write, crm.schemas.custom.read, crm.pipelines.orders.read, tickets, crm.objects.feedback_submissions.read, crm.objects.goals.read, crm.objects.custom.write, crm.objects.custom.read, crm.objects.marketing_events.read, timeline, e-commerce, automation`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hubspot/actions/fetch-properties.ts)


## Endpoint Reference

### Request Endpoint

`GET /properties`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "name": "<string>"
}
```

### Request Response

```json
{
  "result": {
    "updatedAt": "<string>",
    "createdAt": "<string>",
    "name": "<string>",
    "label": "<string>",
    "type": "<string>",
    "fieldType": "<string>",
    "description": "<string>",
    "groupName": "<string>",
    "options": [
      {
        "label": "<string>",
        "value": "<string>",
        "displayOrder": "<number>",
        "hidden": "<boolean>"
      }
    ],
    "displayOrder": "<number>",
    "calculated": "<boolean>",
    "externalOptions": "<boolean>",
    "hasUniqueValue": "<boolean>",
    "hidden": "<boolean>",
    "hubspotDefined": "<boolean>",
    "showCurrencySymbol": "<boolean>",
    "modificationMetadata": {
      "archivable": "<boolean>",
      "readOnlyDefinition": "<boolean>",
      "readOnlyValue": "<boolean>"
    },
    "formField": "<boolean>",
    "dataSensitivity": "<string>"
  }
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/fetch-properties.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/fetch-properties.md)

<!-- END  GENERATED CONTENT -->

