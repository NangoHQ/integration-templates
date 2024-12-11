# Delete User

## General Information

- **Description:** Deletes a user in Zoom. Requires Pro account or higher
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `user:write, user:write:admin`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/zoom/actions/delete-user.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/users`
- **Method:** `DELETE`

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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zoom/actions/delete-user.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zoom/actions/delete-user.md)

<!-- END  GENERATED CONTENT -->

