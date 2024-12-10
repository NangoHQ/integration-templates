# Users

## General Information

- **Description:** Continuously fetches users from either Microsoft 365 or Azure Active
Directory given specified
groups to sync. Expects an `orgsToSync` metadata property with an
array of organization ids.
Details: full refresh, doesn't support deletes, goes back all time,
metadata is required.

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: User.Read.All
- **Endpoint Type:** Sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/microsoft-teams/syncs/users.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/microsoft-teams/microsoft-users`
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
  "displayName": "<string | null>",
  "givenName": "<string | null>",
  "familyName": "<string | null>",
  "picture": "<string | null | undefined>",
  "type": "<string>",
  "createdAt": "<string | null>",
  "deletedAt": "<string | null>",
  "phone": {
    "value": "<string | null | undefined>",
    "type": "<string | null | undefined>"
  },
  "organizationId": "<string | null | undefined>",
  "organizationPath": "<string | null | undefined>",
  "isAdmin": "<boolean | null>",
  "department": "<string | null>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/microsoft-teams/syncs/users.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/microsoft-teams/syncs/users.md)
