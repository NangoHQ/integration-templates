# Disable User

## General Information

- **Description:** Disables a user in Expensify
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/expensify/actions/disable-user.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/users`
- **Method:** `DELETE`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "__extends": {
    "id": "<string>"
  },
  "email": "<string>"
}
```

### Request Response

```json
{
  "success": "<boolean>"
}
```
