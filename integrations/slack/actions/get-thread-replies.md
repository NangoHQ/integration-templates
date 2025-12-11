<!-- BEGIN GENERATED CONTENT -->
# Get Thread Replies

## General Information

- **Description:** Retrieves a thread of messages posted as replies to a message.
- **Version:** 1.0.0
- **Group:** Channels
- **Scopes:** `channels:history`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_getthreadreplies`
- **Input Model:** `ActionInput_slack_getthreadreplies`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/get-thread-replies.ts)


## Endpoint Reference

### Request Endpoint

`GET /conversations/replies`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "channel_id": "<string>",
  "thread_ts": "<string>",
  "limit?": "<number>",
  "cursor?": "<string>"
}
```

### Request Response

```json
{
  "ok": "<boolean>",
  "messages": "<unknown[]>",
  "has_more": "<boolean>",
  "next_cursor": "<string | null>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/get-thread-replies.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/get-thread-replies.md)

<!-- END  GENERATED CONTENT -->

