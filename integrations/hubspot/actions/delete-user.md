# Delete User

## General Information

- **Description:** Deletes a user in Hubspot
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: oauth,settings.users.write (standard scope),crm.objects.users.write (granular)
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hubspot/actions/delete-user.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** /users
- **Method:** DELETE

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
