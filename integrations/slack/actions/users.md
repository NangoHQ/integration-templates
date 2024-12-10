# Users

## General Information
- **Description:** Syncs information about all Users on the Slack workspace

- **Version:** 1.0.1
- **Group:** Others
- **Scopes:**: users:read,users:read.email
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/syncs/users.ts)

### Request Endpoint

- **Path:** `/users`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

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
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/syncs/users.md)

<!-- END  GENERATED CONTENT -->

undefined