# Channels

## General Information

- **Description:** Syncs information about all Slack channels. Which channels get synced
(public, private, IMs, group DMs) depends on the scopes. If
joinPublicChannels is set to true, the bot will automatically join all
public channels as well. Scopes: At least one of channels:read,
groups:read, mpim:read, im:read. To also join public channels:
channels:join

- **Version:** 1.0.1
- **Group:** Others
- **Scopes:** `channels:read, channels:join`
- **Endpoint Type:** Sync
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/syncs/channels.ts)


## Endpoint Reference

### Request Endpoint

`GET /channels`

### Request Query Parameters

- **modified_after:** `(optional, string)` A timestamp (e.g., `2023-05-31T11:46:13.390Z`) used to fetch records modified after this date and time. If not provided, all records are returned. The modified_after parameter is less precise than cursor, as multiple records may share the same modification timestamp.
- **limit:** `(optional, integer)` The maximum number of records to return per page. Defaults to 100.
- **cursor:** `(optional, string)` A marker used to fetch records modified after a specific point in time.If not provided, all records are returned.Each record includes a cursor value found in _nango_metadata.cursor.Save the cursor from the last record retrieved to track your sync progress.Use the cursor parameter together with the limit parameter to paginate through records.The cursor is more precise than modified_after, as it can differentiate between records with the same modification timestamp.
- **filter:** `(optional, added | updated | deleted)` Filter to only show results that have been added or updated or deleted.

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "name": "<string>",
  "is_channel": "<boolean>",
  "is_group": "<boolean>",
  "is_im": "<boolean>",
  "created": "<number>",
  "creator": "<string>",
  "is_archived": "<boolean>",
  "is_general": "<boolean>",
  "name_normalized": "<string>",
  "is_shared": "<boolean>",
  "is_private": "<boolean>",
  "is_mpim": "<boolean>",
  "updated": "<number>",
  "num_members": "<number>",
  "raw_json": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/syncs/channels.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/syncs/channels.md)

<!-- END  GENERATED CONTENT -->

