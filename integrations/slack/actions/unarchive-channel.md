<!-- BEGIN GENERATED CONTENT -->
# Unarchive Channel

## General Information

- **Description:** Restores an archived conversation.
- **Version:** 1.0.0
- **Group:** Channels
- **Scopes:** `channels:manage`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_unarchivechannel`
- **Input Model:** `ActionInput_slack_unarchivechannel`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/unarchive-channel.ts)


## Endpoint Reference

### Request Endpoint

`POST /channels/unarchive`

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
  "ok": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/unarchive-channel.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/unarchive-channel.md)

<!-- END  GENERATED CONTENT -->

