<!-- BEGIN GENERATED CONTENT -->
# Create User

## General Information

- **Description:** Create an admin or agent user in Zendesk. Defaults to agent if a role is not provided
- **Version:** 1.0.0
- **Group:** Users
- **Scopes:** `users:write`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_zendesk_createuser`
- **Input Model:** `ActionInput_zendesk_createuser`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/zendesk/actions/create-user.ts)


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
  "role?": "<enum: 'admin' | 'agent'>"
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zendesk/actions/create-user.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zendesk/actions/create-user.md)

<!-- END  GENERATED CONTENT -->

