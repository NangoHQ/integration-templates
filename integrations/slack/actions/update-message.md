<!-- BEGIN GENERATED CONTENT -->
# Update Message

## General Information

- **Description:** Modifies an existing message in a channel.
- **Version:** 1.0.0
- **Group:** Messages
- **Scopes:** `chat:write`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_updatemessage`
- **Input Model:** `ActionInput_slack_updatemessage`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/update-message.ts)


## Endpoint Reference

### Request Endpoint

`POST /messages/update`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "channel_id": "<string>",
  "message_ts": "<string>",
  "text?": "<string>",
  "blocks?": "<unknown[]>"
}
```

### Request Response

```json
{
  "ok": "<boolean>",
  "ts": "<string>",
  "channel": "<string>",
  "text": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/update-message.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/update-message.md)

<!-- END  GENERATED CONTENT -->

