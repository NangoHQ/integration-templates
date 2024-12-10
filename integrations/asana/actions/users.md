# Users

## General Information
- **Description:** Retrieve all users that exist in the workspace
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/asana/syncs/users.ts)

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
  "created_at": "<string | null>",
  "modified_at": "<string | null>",
  "id": "<string>",
  "name": "<string>",
  "email": "<string | null>",
  "avatar_url": "<string | null>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/asana/syncs/users.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/asana/syncs/users.md)

<!-- END  GENERATED CONTENT -->

undefined