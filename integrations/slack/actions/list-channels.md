<!-- BEGIN GENERATED CONTENT -->
# List Channels

## General Information

- **Description:** Lists all channel-like conversations in a workspace.
- **Version:** 1.0.0
- **Group:** Channels
- **Scopes:** `channels:read`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_listchannels`
- **Input Model:** `ActionInput_slack_listchannels`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/list-channels.ts)


## Endpoint Reference

### Request Endpoint

`GET /channels/list`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "types?": "<string>",
  "limit?": "<number>",
  "cursor?": "<string>"
}
```

### Request Response

```json
{
  "ok": "<boolean>",
  "channels": "<unknown[]>",
  "next_cursor": "<string | null>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/list-channels.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/list-channels.md)

<!-- END  GENERATED CONTENT -->

