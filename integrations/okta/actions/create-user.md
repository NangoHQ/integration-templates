# Create User

## General Information

- **Description:** Creates a new user in your Okta org without credentials.
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** `okta.users.manage`
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/okta-preview/actions/create-user.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/users`
- **Method:** `POST`

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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/okta-preview/actions/create-user.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/okta-preview/actions/create-user.md)

<!-- END  GENERATED CONTENT -->

