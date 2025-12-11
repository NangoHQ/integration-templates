<!-- BEGIN GENERATED CONTENT -->
# Set Channel Topic

## General Information

- **Description:** Updates a channel's topic.
- **Version:** 1.0.0
- **Group:** Channels
- **Scopes:** `channels:write`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_setchanneltopic`
- **Input Model:** `ActionInput_slack_setchanneltopic`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/set-channel-topic.ts)


## Endpoint Reference

### Request Endpoint

`POST /channels/topic`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "channel_id": "<string>",
  "topic": "<string>"
}
```

### Request Response

```json
{
  "ok": "<boolean>",
  "topic": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/set-channel-topic.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/set-channel-topic.md)

<!-- END  GENERATED CONTENT -->

