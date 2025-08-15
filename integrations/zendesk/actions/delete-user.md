<!-- BEGIN GENERATED CONTENT -->
# Delete User

## General Information

- **Description:** Delete a user in Zendesk
- **Version:** 1.0.0
- **Group:** Users
- **Scopes:** `users:write`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_zendesk_deleteuser`
- **Input Model:** `ActionInput_zendesk_deleteuser`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/zendesk/actions/delete-user.ts)


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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zendesk/actions/delete-user.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zendesk/actions/delete-user.md)

<!-- END  GENERATED CONTENT -->

