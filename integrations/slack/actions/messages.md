# Messages

## General Information
- **Description:** Syncs Slack messages, thread replies and reactions from messages &
thread replies for all channels, group dms and dms the bot is a part
of. For every channel it will do an initial full sync on first
detection of the channel. For subsequent runs it will sync messages,
threads & reactions from the last 10 days. Scopes required:
channels:read, and at least one of
channels:history, groups:history, mpim:history, im:history

- **Version:** 1.0.1
- **Group:** Others
- **Scopes:**: channels:read,channels:history
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/syncs/messages.ts)

### Request Endpoint

- **Path:** `undefined`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "0": {
    "id": "<string>",
    "ts": "<string>",
    "channel_id": "<string>",
    "thread_ts": "<string | null>",
    "app_id": "<string | null>",
    "bot_id": "<string | null>",
    "display_as_bot": "<boolean | null>",
    "is_locked": "<boolean | null>",
    "metadata": {
      "event_type": "<string>"
    },
    "parent_user_id": "<string | null>",
    "subtype": "<string | null>",
    "text": "<string | null>",
    "topic": "<string | null>",
    "user_id": "<string | null>",
    "raw_json": "<string>"
  },
  "1": {
    "id": "<string>",
    "ts": "<string>",
    "channel_id": "<string>",
    "thread_ts": "<string | null>",
    "app_id": "<string | null>",
    "bot_id": "<string | null>",
    "display_as_bot": "<boolean | null>",
    "is_locked": "<boolean | null>",
    "metadata": {
      "event_type": "<string>"
    },
    "parent_user_id": "<string | null>",
    "subtype": "<string | null>",
    "text": "<string | null>",
    "topic": "<string | null>",
    "user_id": "<string | null>",
    "root": {
      "message_id": "<string | null>",
      "ts": "<string>"
    },
    "raw_json": "<string>"
  },
  "2": {
    "id": "<string>",
    "message_ts": "<string>",
    "thread_ts": "<string>",
    "channel_id": "<string>",
    "user_id": "<string>",
    "reaction_name": "<string>"
  }
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/syncs/messages.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/syncs/messages.md)

<!-- END  GENERATED CONTENT -->

undefined