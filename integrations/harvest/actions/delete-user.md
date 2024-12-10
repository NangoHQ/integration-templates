# Delete User

## General Information

- **Description:** Deletes a user in Harvest
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: administrator
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/harvest/actions/delete-user.ts)

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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/harvest/actions/delete-user.ts)
-- [ReadMe History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/harvest/actions/delete-user.md)
