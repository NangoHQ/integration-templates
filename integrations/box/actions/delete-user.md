<!-- BEGIN GENERATED CONTENT -->
# Delete User

## General Information

- **Description:** Deletes a user in Box. Requires an enterprise account.
- **Version:** 1.0.0
- **Group:** Users
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `SuccessResponse`
- **Input Model:** `BoxDeleteUser`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/box/actions/delete-user.ts)


## Endpoint Reference

### Request Endpoint

`DELETE /users`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id": "<string>",
  "force?": "<boolean>",
  "notify?": "<boolean>"
}
```

### Request Response

```json
{
  "success": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/box/actions/delete-user.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/box/actions/delete-user.md)

<!-- END  GENERATED CONTENT -->

