<!-- BEGIN GENERATED CONTENT -->
# Delete User

## General Information

- **Description:** Deletes a user in Dropbox. Requires Dropbox Business.
- **Version:** 1.0.0
- **Group:** Users
- **Scopes:** `members.delete`
- **Endpoint Type:** Action
- **Model:** `SuccessResponse`
- **Input Model:** `IdEntity`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/dropbox/actions/delete-user.ts)


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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/dropbox/actions/delete-user.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/dropbox/actions/delete-user.md)

<!-- END  GENERATED CONTENT -->

