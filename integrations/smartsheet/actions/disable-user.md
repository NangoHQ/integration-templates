<!-- BEGIN GENERATED CONTENT -->
# Disable User

## General Information

- **Description:** Disables a user in an organization account. User will no longer be able to access Smartsheet in any way. User's assets will continue to be owned by this user until they are transferred to another user.
- **Version:** 1.0.0
- **Group:** Users
- **Scopes:** `ADMIN_USERS`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_smartsheet_disableuser`
- **Input Model:** `ActionInput_smartsheet_disableuser`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/smartsheet/actions/disable-user.ts)


## Endpoint Reference

### Request Endpoint

`POST /users/disable`

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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/smartsheet/actions/disable-user.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/smartsheet/actions/disable-user.md)

<!-- END  GENERATED CONTENT -->

