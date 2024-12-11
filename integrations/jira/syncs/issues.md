# Issues

## General Information

- **Description:** Fetches a list of issues from Jira

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `read:jira-work`
- **Endpoint Type:** Sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/jira/syncs/issues.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/issues`
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
  "createdAt": "<string>",
  "updatedAt": "<string>",
  "id": "<string>",
  "key": "<string>",
  "summary": "<string>",
  "issueType": "<string>",
  "status": "<string>",
  "assignee": "<string | null>",
  "url": "<string>",
  "webUrl": "<string>",
  "projectId": "<string>",
  "projectKey": "<string>",
  "projectName": "<string>",
  "comments": {
    "0": {
      "createdAt": "<string>",
      "updatedAt": "<string>",
      "id": "<string>",
      "author": {
        "accountId": "<string | null>",
        "active": "<boolean>",
        "displayName": "<string>",
        "emailAddress": "<string | null>"
      },
      "body": "<object>"
    }
  }
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/jira/syncs/issues.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/jira/syncs/issues.md)

<!-- END  GENERATED CONTENT -->

