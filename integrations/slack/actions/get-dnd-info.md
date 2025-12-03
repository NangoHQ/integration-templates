<!-- BEGIN GENERATED CONTENT -->
# Get Dnd Info

## General Information

- **Description:** Gets Do Not Disturb settings for a user.
- **Version:** 1.0.0
- **Group:** Actions
- **Scopes:** `dnd:read`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_getdndinfo`
- **Input Model:** `ActionInput_slack_getdndinfo`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/get-dnd-info.ts)


## Endpoint Reference

### Request Endpoint

`GET /get-dnd-info`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "user_id?": "<string>"
}
```

### Request Response

```json
{
  "ok": "<boolean>",
  "dnd_enabled": "<boolean>",
  "next_dnd_start_ts": "<number>",
  "next_dnd_end_ts": "<number>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/get-dnd-info.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/get-dnd-info.md)

<!-- END  GENERATED CONTENT -->

