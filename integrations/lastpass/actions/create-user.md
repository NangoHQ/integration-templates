<!-- BEGIN GENERATED CONTENT -->
# Create User

## General Information

- **Description:** Creates a user in Lastpass.
- **Version:** 0.0.1
- **Group:** Users
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `User`
- **Input Model:** `LastPassCreateUser`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/lastpass/actions/create-user.ts)


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
  "groups?": [
    "<string>"
  ],
  "duousername?": "<string>",
  "securidusername?": "<string>",
  "password?": "<string>",
  "password_reset_required?": "<boolean>"
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lastpass/actions/create-user.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lastpass/actions/create-user.md)

<!-- END  GENERATED CONTENT -->

