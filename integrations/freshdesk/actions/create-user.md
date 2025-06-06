<!-- BEGIN GENERATED CONTENT -->
# Create User

## General Information

- **Description:** Creates a user in FreshDesk
- **Version:** 1.0.0
- **Group:** Users
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `User`
- **Input Model:** `FreshdeskCreateUser`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/freshdesk/actions/create-user.ts)


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
  "ticket_scope?": "<number>",
  "ticketScope?": "<globalAccess | groupAccess | restrictedAccess>",
  "occasional?": "<boolean>",
  "signature?": "<string>",
  "skill_ids?": [
    "<number>"
  ],
  "group_ids?": [
    "<number>"
  ],
  "role_ids?": [
    "<number>"
  ],
  "agent_type?": "<number>",
  "agentType?": "<support | field | collaborator>",
  "language?": "<string>",
  "time_zone?": "<string>",
  "focus_mode?": "<boolean>"
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/freshdesk/actions/create-user.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/freshdesk/actions/create-user.md)

<!-- END  GENERATED CONTENT -->

