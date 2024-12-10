# Users

## General Information

- **Description:** Syncs information about all Users on the Slack workspace

- **Version:** 1.0.1
- **Group:** Others
- **Scopes:**: users:read,users:read.email
- **Endpoint Type:** Sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/syncs/users.ts)

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
  "team_id": "<string>",
  "name": "<string>",
  "deleted": "<boolean>",
  "tz": "<string>",
  "tz_label": "<string>",
  "tz_offset": "<number>",
  "profile": {
    "avatar_hash": "<string>",
    "real_name": "<string | null>",
    "display_name": "<string | null>",
    "real_name_normalized": "<string | null>",
    "display_name_normalized": "<string | null>",
    "email": "<string | null>",
    "image_original": "<string | null | undefined>"
  },
  "is_admin": "<boolean>",
  "is_owner": "<boolean>",
  "is_primary_owner": "<boolean>",
  "is_restricted": "<boolean>",
  "is_ultra_restricted": "<boolean>",
  "is_bot": "<boolean>",
  "updated": "<number>",
  "is_app_user": "<boolean>",
  "raw_json": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/syncs/users.ts)
-- [ReadMe History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/syncs/users.md)
