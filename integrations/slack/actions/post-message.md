<!-- BEGIN GENERATED CONTENT -->
# Post Message

## General Information

- **Description:** Posts a message to a public channel, private channel, or direct message.
- **Version:** 1.0.0
- **Group:** Messages
- **Scopes:** `chat:write`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_postmessage`
- **Input Model:** `ActionInput_slack_postmessage`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/post-message.ts)


## Endpoint Reference

### Request Endpoint

`POST /messages/post`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "channel_id": "<string>",
  "text": "<string>",
  "thread_ts?": "<string>",
  "blocks?": "<unknown[]>"
}
```

### Request Response

```json
{
  "ok": "<boolean>",
  "ts": "<string>",
  "channel": "<string>",
  "message": {
    "text": "<string>",
    "type": "<string>",
    "user": "<string>"
  }
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/post-message.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/post-message.md)

<!-- END  GENERATED CONTENT -->

