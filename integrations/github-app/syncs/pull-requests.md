<!-- BEGIN GENERATED CONTENT -->
# Pull Requests

## General Information

- **Description:** Get all pull requests from a Github repository.

- **Version:** 0.0.1
- **Group:** Pull Requests
- **Scopes:** _None_
- **Endpoint Type:** Sync
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/github-app/syncs/pull-requests.ts)


## Endpoint Reference

### Request Endpoint

`GET /pull-requests`

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
  "state": "<string>",
  "title": "<string>",
  "user": {
    "id": "<string>",
    "url": "<string>"
  },
  "assignees": [
    {
      "id": "<string>",
      "url": "<string>"
    }
  ],
  "reviewers": [
    {
      "id": "<string>",
      "url": "<string>"
    }
  ],
  "draft": "<boolean>",
  "labels": [
    "<string>"
  ],
  "reviewDecision": "<APPROVED | CHANGES_REQUESTED | REVIEW_REQUIRED>",
  "latestComment": {
    "id": "<string>",
    "body": "<string>",
    "user": {
      "id": "<string>",
      "url": "<string>"
    },
    "createdAt": "<string>"
  }
}
```

### Expected Metadata

```json
{
  "owner": "<string>",
  "repo": "<string>",
  "syncWindowMinutes?": "<number>",
  "branch?": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/github-app/syncs/pull-requests.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/github-app/syncs/pull-requests.md)

<!-- END  GENERATED CONTENT -->

