<!-- BEGIN GENERATED CONTENT -->
# Rename Channel

## General Information

- **Description:** Renames a conversation with proper permissions.
- **Version:** 1.0.0
- **Group:** Channels
- **Scopes:** `channels:manage`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_renamechannel`
- **Input Model:** `ActionInput_slack_renamechannel`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/rename-channel.ts)


## Endpoint Reference

### Request Endpoint

`POST /channels/rename`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "channel_id": "<string>",
  "channel_name": "<string>"
}
```

### Request Response

```json
{
  "ok": "<boolean>",
  "channel?": "<unknown>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/rename-channel.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/rename-channel.md)

<!-- END  GENERATED CONTENT -->

