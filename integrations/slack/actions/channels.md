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
- **Scopes:**: channels:read,channels:join
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/syncs/channels.ts)

### Request Endpoint

- **Path:** `/channels`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

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

undefined