<!-- BEGIN GENERATED CONTENT -->
# Mark As Read

## General Information

- **Description:** Moves the read cursor in a conversation.
- **Version:** 1.0.0
- **Group:** Channels
- **Scopes:** `channels:write, groups:write, im:write, mpim:write`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_markasread`
- **Input Model:** `ActionInput_slack_markasread`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/mark-as-read.ts)


## Endpoint Reference

### Request Endpoint

`POST /channels/mark`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "channel_id": "<string>",
  "message_ts": "<string>"
}
```

### Request Response

```json
{
  "ok": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/mark-as-read.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/mark-as-read.md)

<!-- END  GENERATED CONTENT -->

