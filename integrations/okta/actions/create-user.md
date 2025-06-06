<!-- BEGIN GENERATED CONTENT -->
# Create User

## General Information

- **Description:** Creates a new user in your Okta org without credentials.
- **Version:** 1.0.1
- **Group:** Users
- **Scopes:** `okta.users.manage`
- **Endpoint Type:** Action
- **Model:** `User`
- **Input Model:** `OktaCreateUser`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/okta/actions/create-user.ts)


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
  "login": "<string>",
  "mobilePhone?": "<string | undefined | null>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "status": "<string>",
  "created": "<string>",
  "activated": "<string>",
  "statusChanged": "<string>",
  "lastLogin": "<string | null>",
  "lastUpdated": "<string>",
  "passwordChanged": "<string | null>",
  "type": {
    "id": "<string>"
  },
  "profile": {
    "firstName": "<string | null>",
    "lastName": "<string | null>",
    "mobilePhone": "<string | null>",
    "secondEmail": "<string | null>",
    "login": "<string>",
    "email": "<string>"
  }
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/okta/actions/create-user.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/okta/actions/create-user.md)

<!-- END  GENERATED CONTENT -->

