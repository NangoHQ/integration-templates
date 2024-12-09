# Delete User

## General Information

- **Description:** Deletes a user in DocuSign
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: openid,signature
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/docusign-sandbox/actions/delete-user.ts)

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
