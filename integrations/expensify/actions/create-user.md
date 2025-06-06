<!-- BEGIN GENERATED CONTENT -->
# Create User

## General Information

- **Description:** Create a user in the account

- **Version:** 1.0.0
- **Group:** Users
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ExpsensifyNullableUser`
- **Input Model:** `CreateUser`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/expensify/actions/create-user.ts)


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
  "id": "<string | null>",
  "firstName": "<string | null>",
  "lastName": "<string | null>",
  "email": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/expensify/actions/create-user.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/expensify/actions/create-user.md)

<!-- END  GENERATED CONTENT -->

