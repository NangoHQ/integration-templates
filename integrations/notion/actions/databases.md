# Databases

## General Information
- **Description:** Sync a database content with each row as an entry. Store the top level
database information in the metadata to be able to reconcile the database

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/notion/syncs/databases.ts)

### Request Endpoint

- **Path:** `/notion/database`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "row": {
    "__string": "<any>"
  },
  "meta": {
    "databaseId": "<string>",
    "path": "<string>",
    "title": "<string>",
    "last_modified": "<string>"
  }
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/notion/syncs/databases.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/notion/syncs/databases.md)

<!-- END  GENERATED CONTENT -->

undefined