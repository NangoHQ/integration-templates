# Fetch Properties

## General Information

- **Description:** Fetch the properties of a specified object
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hubspot/actions/fetch-properties.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/properties`
- **Method:** `GET`

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
    "__extends": {
      "updatedAt": "<string>",
      "createdAt": "<string>"
    },
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
