<!-- BEGIN GENERATED CONTENT -->
# Get Conversation History

## General Information

- **Description:** Fetches message history from a channel or conversation.
- **Version:** 1.0.0
- **Group:** Channels
- **Scopes:** `channels:history`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_getconversationhistory`
- **Input Model:** `ActionInput_slack_getconversationhistory`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/get-conversation-history.ts)


## Endpoint Reference

### Request Endpoint

`GET /conversations/history`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "channel_id": "<string>",
  "limit?": "<number>",
  "cursor?": "<string>",
  "oldest_ts?": "<string>",
  "latest_ts?": "<string>"
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/get-conversation-history.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/get-conversation-history.md)

<!-- END  GENERATED CONTENT -->

