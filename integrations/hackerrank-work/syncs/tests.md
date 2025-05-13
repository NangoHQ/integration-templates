<!-- BEGIN GENERATED CONTENT -->
# Tests

## General Information

- **Description:** Fetches a list of tests from hackerrank work

- **Version:** 1.0.1
- **Group:** Tests
- **Scopes:** _None_
- **Endpoint Type:** Sync
- **Model:** `HackerRankWorkTest`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hackerrank-work/syncs/tests.ts)


## Endpoint Reference

### Request Endpoint

`GET /tests`

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
  "unique_id": "<string>",
  "name": "<string>",
  "duration": "<number>",
  "owner": "<string>",
  "instructions": "<string>",
  "created_at": "<date>",
  "state": "<string>",
  "locked": "<boolean>",
  "test_type": "<string>",
  "starred": "<boolean>",
  "start_time": "<date>",
  "end_time": "<date>",
  "draft": "<boolean>",
  "questions": [
    "<string>"
  ],
  "sections": "<object>",
  "tags": [
    "<string>"
  ],
  "permission": "<number>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hackerrank-work/syncs/tests.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hackerrank-work/syncs/tests.md)

<!-- END  GENERATED CONTENT -->

