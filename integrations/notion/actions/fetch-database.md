# Fetch Database

## General Information

- **Description:** Fetch a specific Notion database by passing in the database id. This action fetches the database and outputs an object. Note that this should be used for small databases.
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/notion/actions/fetch-database.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/fetch-database`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "databaseId": "<string>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "path": "<string>",
  "title": "<string>",
  "meta": "<object>",
  "last_modified": "<string>",
  "entries": [
    {
      "id": "<string>",
      "row": {
        "__string": "<any>"
      }
    }
  ]
}
```
