<!-- BEGIN GENERATED CONTENT -->
# Send Message

## General Information

- **Description:** An action that sends a message to a slack channel.
- **Version:** 2.0.0
- **Group:** Messages
- **Scopes:** `chat:write`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_sendmessage`
- **Input Model:** `ActionInput_slack_sendmessage`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/send-message.ts)


## Endpoint Reference

### Request Endpoint

`POST /messages`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "channel": "<string>",
  "text": "<string>"
}
```

### Request Response

```json
{
  "ok": "<boolean>",
  "channel?": "<string>",
  "ts?": "<string>",
  "message?": "<string>",
  "warning?": "<string>",
  "error?": "<string>",
  "raw_json": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/send-message.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/send-message.md)

<!-- END  GENERATED CONTENT -->

