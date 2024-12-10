# Users

## General Information
- **Description:** Fetches lists users in your org
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: okta.users.read
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/okta-preview/syncs/users.ts)

### Request Endpoint

- **Path:** `/users`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

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


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/okta-preview/syncs/users.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/okta-preview/syncs/users.md)

<!-- END  GENERATED CONTENT -->



undefined