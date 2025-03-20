<!-- BEGIN GENERATED CONTENT -->
# Documents

## General Information

- **Description:** Sync the metadata of a specified file or folders from Google Drive,
handling both individual files and nested folders.
Metadata required to filter on a particular folder, or file(s). Metadata
fields should be `{"files": ["<some-id>"]}` OR
`{"folders": ["<some-id>"]}`. The ID should be able to be provided
by using the Google Picker API
(https://developers.google.com/drive/picker/guides/overview)
and using the ID field provided by the response
(https://developers.google.com/drive/picker/reference/results)

- **Version:** 3.0.0
- **Group:** Documents
- **Scopes:** `https://www.googleapis.com/auth/drive.readonly`
- **Endpoint Type:** Sync
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/google-drive/syncs/documents.ts)


## Endpoint Reference

### Request Endpoint

`GET /documents`

### Request Query Parameters

- **modified_after:** `(optional, string)` A timestamp (e.g., `2023-05-31T11:46:13.390Z`) used to fetch records modified after this date and time. If not provided, all records are returned. The modified_after parameter is less precise than cursor, as multiple records may share the same modification timestamp.
- **limit:** `(optional, integer)` The maximum number of records to return per page. Defaults to 100.
- **cursor:** `(optional, string)` A marker used to fetch records modified after a specific point in time.If not provided, all records are returned.Each record includes a cursor value found in _nango_metadata.cursor.Save the cursor from the last record retrieved to track your sync progress.Use the cursor parameter together with the limit parameter to paginate through records.The cursor is more precise than modified_after, as it can differentiate between records with the same modification timestamp.
- **filter:** `(optional, added | updated | deleted)` Filter to only show results that have been added or updated or deleted.
- **ids:** `(optional, string[])` An array of string containing a list of your records IDs. The list will be filtered to include only the records with a matching ID.

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "url": "<string>",
  "title": "<string>",
  "mimeType": "<string>",
  "updatedAt": "<string>"
}
```

### Expected Metadata

```json
{
  "files": "<string[] | undefined>",
  "folders": "<string[] | undefined>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-drive/syncs/documents.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-drive/syncs/documents.md)

<!-- END  GENERATED CONTENT -->

