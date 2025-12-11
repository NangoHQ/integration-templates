<!-- BEGIN GENERATED CONTENT -->
# Leave Channel

## General Information

- **Description:** Leaves a public or private channel.
- **Version:** 1.0.0
- **Group:** Channels
- **Scopes:** `channels:write`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_leavechannel`
- **Input Model:** `ActionInput_slack_leavechannel`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/leave-channel.ts)


## Endpoint Reference

### Request Endpoint

`POST /channels/leave`

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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/leave-channel.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/leave-channel.md)

<!-- END  GENERATED CONTENT -->

