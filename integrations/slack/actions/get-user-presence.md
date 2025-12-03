<!-- BEGIN GENERATED CONTENT -->
# Get User Presence

## General Information

- **Description:** Gets a user's current presence status and activity.
- **Version:** 1.0.0
- **Group:** Users
- **Scopes:** `users:read`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_getuserpresence`
- **Input Model:** `ActionInput_slack_getuserpresence`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/get-user-presence.ts)


## Endpoint Reference

### Request Endpoint

`GET /users/presence`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "user_id": "<string>"
}
```

### Request Response

```json
{
  "ok": "<boolean>",
  "presence": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/get-user-presence.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/get-user-presence.md)

<!-- END  GENERATED CONTENT -->

