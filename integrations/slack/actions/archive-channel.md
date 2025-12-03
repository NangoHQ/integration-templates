<!-- BEGIN GENERATED CONTENT -->
# Archive Channel

## General Information

- **Description:** Archives a conversation making it read-only.
- **Version:** 1.0.0
- **Group:** Channels
- **Scopes:** `channels:write, groups:write, im:write, mpim:write`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_archivechannel`
- **Input Model:** `ActionInput_slack_archivechannel`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/archive-channel.ts)


## Endpoint Reference

### Request Endpoint

`POST /archive-channel`

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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/archive-channel.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/archive-channel.md)

<!-- END  GENERATED CONTENT -->

