<!-- BEGIN GENERATED CONTENT -->
# Delete Message

## General Information

- **Description:** Removes a message from a conversation.
- **Version:** 1.0.0
- **Group:** Messages
- **Scopes:** `chat:write`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_deletemessage`
- **Input Model:** `ActionInput_slack_deletemessage`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/delete-message.ts)


## Endpoint Reference

### Request Endpoint

`POST /messages/delete`

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
  "ok": "<boolean>",
  "ts": "<string>",
  "channel": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/delete-message.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/delete-message.md)

<!-- END  GENERATED CONTENT -->

