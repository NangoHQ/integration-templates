<!-- BEGIN GENERATED CONTENT -->
# Join Channel

## General Information

- **Description:** Joins a public or private channel.
- **Version:** 1.0.0
- **Group:** Channels
- **Scopes:** `channels:write`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_joinchannel`
- **Input Model:** `ActionInput_slack_joinchannel`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/join-channel.ts)


## Endpoint Reference

### Request Endpoint

`POST /channels/join`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "channel_id": "<string>"
}
```

### Request Response

```json
{
  "ok": "<boolean>",
  "channel": {
    "id": "<string>",
    "name": "<string>",
    "is_channel": "<boolean>",
    "is_group": "<boolean>",
    "is_im": "<boolean>",
    "is_mpim": "<boolean>",
    "is_private": "<boolean>",
    "created": "<number>",
    "is_archived": "<boolean>",
    "is_general": "<boolean>",
    "unlinked": "<number>",
    "name_normalized": "<string>",
    "is_shared": "<boolean>",
    "is_org_shared": "<boolean>",
    "is_pending_ext_shared": "<boolean>",
    "pending_shared": "<unknown[]>",
    "context_team_id": "<string>",
    "updated": "<number>",
    "parent_conversation": "<string>",
    "creator": "<string>",
    "is_ext_shared": "<boolean>",
    "shared_team_ids": "<string[]>",
    "pending_connected_team_ids": "<string[]>",
    "is_member": "<boolean>",
    "topic": {
      "value": "<string>",
      "creator": "<string>",
      "last_set": "<number>"
    },
    "purpose": {
      "value": "<string>",
      "creator": "<string>",
      "last_set": "<number>"
    },
    "previous_names": "<string[]>"
  }
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/join-channel.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/join-channel.md)

<!-- END  GENERATED CONTENT -->

