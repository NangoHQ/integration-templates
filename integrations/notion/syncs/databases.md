# Databases

## General Information

- **Description:** Sync a database content with each row as an entry. Store the top level
database information in the metadata to be able to reconcile the database

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** _None_
- **Endpoint Type:** Sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/notion/syncs/databases.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/notion/database`
- **Method:** `GET`

### Request Query Parameters

- **modified_after:** `(optional, string)` A timestamp (e.g., `2023-05-31T11:46:13.390Z`) used to fetch records modified after this date and time. If not provided, all records are returned. The modified_after parameter is less precise than cursor, as multiple records may share the same modification timestamp.
- **limit:** `(optional, integer)` The maximum number of records to return per page. Defaults to 100.
- **cursor:** `(optional, string)` A marker used to fetch records modified after a specific point in time.If not provided, all records are returned.Each record includes a cursor value found in _nango_metadata.cursor.Save the cursor from the last record retrieved to track your sync progress.Use the cursor parameter together with the limit parameter to paginate through records.The cursor is more precise than modified_after, as it can differentiate between records with the same modification timestamp.
- **filter:** `(optional, added | updated | deleted)` Filter to only show results that have been added or updated or deleted.

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

