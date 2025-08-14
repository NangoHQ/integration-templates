<!-- BEGIN GENERATED CONTENT -->
# Create User

## General Information

- **Description:** Creates a user in Smartsheet
- **Version:** 1.0.0
- **Group:** Users
- **Scopes:** `ADMIN_USERS`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_smartsheet_createuser`
- **Input Model:** `ActionInput_smartsheet_createuser`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/smartsheet/actions/create-user.ts)


## Endpoint Reference

### Request Endpoint

`POST /users`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "firstName": "<string>",
  "lastName": "<string>",
  "email": "<string>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "email": "<string>",
  "firstName": "<string>",
  "lastName": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/smartsheet/actions/create-user.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/smartsheet/actions/create-user.md)

<!-- END  GENERATED CONTENT -->

