# Disable User

## General Information

- **Description:** Disables a user in Datadog
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: user_access_manage
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/datadog/actions/disable-user.ts)

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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/datadog/actions/disable-user.ts)
-- [ReadMe History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/datadog/actions/disable-user.md)
