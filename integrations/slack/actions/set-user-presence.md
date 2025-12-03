<!-- BEGIN GENERATED CONTENT -->
# Set User Presence

## General Information

- **Description:** Sets the calling user's manual presence status.
- **Version:** 1.0.0
- **Group:** Users
- **Scopes:** `users:write`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_setuserpresence`
- **Input Model:** `ActionInput_slack_setuserpresence`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/set-user-presence.ts)


## Endpoint Reference

### Request Endpoint

`POST /users/presence`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "presence": "<string>"
}
```

### Request Response

```json
{
  "ok": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/set-user-presence.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/set-user-presence.md)

<!-- END  GENERATED CONTENT -->

