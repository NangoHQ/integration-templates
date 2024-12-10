# Users

## General Information

- **Description:** Fetches a list of users from hackerrank work

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** Sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hackerrank-work/syncs/users.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/users`
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
  "email": "<string>",
  "firstname": "<string>",
  "lastname": "<string>",
  "country": "<string>",
  "role": "<string>",
  "status": "<string>",
  "phone": "<string>",
  "timezone": "<string>",
  "questions_permission": "<number>",
  "tests_permission": "<number>",
  "interviews_permission": "<number>",
  "candidates_permission": "<number>",
  "shared_questions_permission": "<number>",
  "shared_tests_permission": "<number>",
  "shared_interviews_permission": "<number>",
  "shared_candidates_permission": "<number>",
  "created_at": "<date>",
  "company_admin": "<boolean>",
  "team_admin": "<boolean>",
  "company_id": "<string>",
  "teams": {},
  "activated": "<boolean>",
  "last_activity_time": "<date>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hackerrank-work/syncs/users.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hackerrank-work/syncs/users.md)

<!-- END  GENERATED CONTENT -->

