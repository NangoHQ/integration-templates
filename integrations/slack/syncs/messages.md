<!-- BEGIN GENERATED CONTENT -->
# Messages

## General Information

- **Description:** Syncs Slack messages, thread replies and reactions from messages &
thread replies for all channels, group dms and dms the bot is a part
of. For every channel it will do an initial full sync on first
detection of the channel. For subsequent runs it will sync messages,
threads & reactions from the last 10 days. Scopes required:
channels:read, and at least one of
channels:history, groups:history, mpim:history, im:history

- **Version:** 1.0.3
- **Group:** Messages
- **Scopes:** `channels:read, channels:history`
- **Endpoint Type:** Sync
- **Models:** `SlackMessage`, `SlackMessageReply`, `SlackMessageReaction`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/syncs/messages.ts)


## Endpoint Reference

### Request Endpoint

`GET /messages`, `GET /messages-reply`, `GET /messages-reaction`

### Request Query Parameters

- **modified_after:** `(optional, string)` A timestamp (e.g., `2023-05-31T11:46:13.390Z`) used to fetch records modified after this date and time. If not provided, all records are returned. The modified_after parameter is less precise than cursor, as multiple records may share the same modification timestamp.
- **limit:** `(optional, integer)` The maximum number of records to return per page. Defaults to 100.
- **cursor:** `(optional, string)` A marker used to fetch records modified after a specific point in time.If not provided, all records are returned.Each record includes a cursor value found in _nango_metadata.cursor.Save the cursor from the last record retrieved to track your sync progress.Use the cursor parameter together with the limit parameter to paginate through records.The cursor is more precise than modified_after, as it can differentiate between records with the same modification timestamp.
- **filter:** `(optional, added | updated | deleted)` Filter to only show results that have been added or updated or deleted.
- **ids:** `(optional, string[])` An array of string containing a list of your records IDs. The list will be filtered to include only the records with a matching ID.

### Request Body

_No request body_

### Request Response

```json
{
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
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/syncs/messages.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/syncs/messages.md)

<!-- END  GENERATED CONTENT -->

