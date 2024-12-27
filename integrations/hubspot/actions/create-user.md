<!-- BEGIN GENERATED CONTENT -->
# Create User

## General Information

- **Description:** Creates a single user in Hubspot
- **Version:** 0.0.1
- **Group:** Users
- **Scopes:** `oauth, settings.users.write (standard scope), crm.objects.users.write (granular)`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hubspot/actions/create-user.ts)


## Endpoint Reference

### Request Endpoint

`POST /users`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "firstName?": "<string>",
  "lastName?": "<string>",
  "primaryTeamId?": "<string>",
  "email": "<string>",
  "sendWelcomeEmail?": "<boolean>",
  "roleId?": "<string>",
  "secondaryTeamIds?": [
    "<string>"
  ]
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
  "superAdmin": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/create-user.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/create-user.md)

<!-- END  GENERATED CONTENT -->

