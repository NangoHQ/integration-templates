<!-- BEGIN GENERATED CONTENT -->
# Delete User

## General Information

- **Description:** Deletes a user from Smartsheet. User is transitioned to a free collaborator with read-only access to owned reports, sheets, Sights, workspaces, and any shared templates (unless those are optionally transferred to another user).

- **Version:** 0.0.1
- **Group:** Users
- **Scopes:** `ADMIN_USERS`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/smartsheet/actions/delete-user.ts)


## Endpoint Reference

### Request Endpoint

`DELETE /users`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id": "<string>"
}
```

### Request Response

```json
{
  "success": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/smartsheet/actions/delete-user.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/smartsheet/actions/delete-user.md)

<!-- END  GENERATED CONTENT -->

