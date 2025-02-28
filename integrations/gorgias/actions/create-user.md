<!-- BEGIN GENERATED CONTENT -->
# Create User

## General Information

- **Description:** Creates a new user with a role in Gorgias. Defaults to agent if a role is not provided

- **Version:** 1.0.0
- **Group:** Users
- **Scopes:** `users:write`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/gorgias/actions/create-user.ts)


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
  "email": "<string>",
  "role": "<admin | agent | basic-agent | lite-agent | observer-agent>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "firstName": "<string>",
  "lastName": "<string>",
  "email": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gorgias/actions/create-user.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gorgias/actions/create-user.md)

<!-- END  GENERATED CONTENT -->

