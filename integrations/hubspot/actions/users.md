# Users

## General Information
- **Description:** Fetches a list of users from Hubspot

- **Version:** 1.0.2
- **Group:** Others
- **Scopes:**: oauth,settings.users.read (standard scope),crm.objects.users.read (granular scope)
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hubspot/syncs/users.ts)

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
  "email": "<string>",
  "firstName": "<string>",
  "lastName": "<string>",
  "roleIds": [
    "<string>"
  ],
  "primaryTeamId?": "<string | undefined>",
  "superAdmin": "<boolean>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/syncs/users.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/syncs/users.md)

<!-- END  GENERATED CONTENT -->

undefined