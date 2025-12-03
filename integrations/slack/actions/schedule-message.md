<!-- BEGIN GENERATED CONTENT -->
# Schedule Message

## General Information

- **Description:** Schedules a message for future delivery up to 120 days ahead.
- **Version:** 1.0.0
- **Group:** Messages
- **Scopes:** `chat:write`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_schedulemessage`
- **Input Model:** `ActionInput_slack_schedulemessage`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/schedule-message.ts)


## Endpoint Reference

### Request Endpoint

`POST /messages/schedule`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "channel_id": "<string>",
  "text": "<string>",
  "post_at": "<number>",
  "thread_ts?": "<string>"
}
```

### Request Response

```json
{
  "ok": "<boolean>",
  "scheduled_message_id": "<string>",
  "post_at": "<number>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/schedule-message.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/schedule-message.md)

<!-- END  GENERATED CONTENT -->

