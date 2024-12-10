# Tables

## General Information
- **Description:** Lists all tables with their schema for all bases with a reference to the base id that
the table belongs to

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: schema.bases:read
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/airtable/syncs/tables.ts)

### Request Endpoint

- **Path:** `/tables`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "baseId": "<string>",
  "baseName": "<string>",
  "id": "<string>",
  "name": "<string>",
  "views": [
    {
      "id": "<string>",
      "name": "<string>",
      "type": "<string>"
    }
  ],
  "fields": [
    {
      "id": "<string>",
      "description": "<string>",
      "name": "<string>",
      "type": "<string>",
      "options?": {
        "__string": "<any>"
      }
    }
  ],
  "primaryFieldId": "<string>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/airtable/syncs/tables.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/airtable/syncs/tables.md)

<!-- END  GENERATED CONTENT -->

undefined