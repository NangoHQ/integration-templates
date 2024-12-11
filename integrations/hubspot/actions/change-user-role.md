# Change User Role

## General Information

- **Description:** Change a user role. Requires an enterprise account.
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `oauth, settings.users.write (standard scope), crm.objects.users.write (granular scope)`
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hubspot/actions/change-user-role.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/roles`
- **Method:** `PUT`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id": "<string>",
  "firstName?": "<string>",
  "lastName?": "<string>",
  "primaryTeamId?": "<string>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "firstName": "<string>",
  "lastName": "<string>",
  "primaryTeamId?": "<string>",
  "email": "<string>",
  "sendWelcomeEmail": "<boolean>",
  "roleIds": [
    "<string>"
  ],
  "secondaryTeamIds": [
    "<string>"
  ],
  "superAdmin": "<boolean>",
  "firstName?": "<string>",
  "lastName?": "<string>",
  "sendWelcomeEmail?": "<boolean>",
  "secondaryTeamIds?": [
    "<string>"
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/change-user-role.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/change-user-role.md)

<!-- END  GENERATED CONTENT -->

