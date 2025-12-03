<!-- BEGIN GENERATED CONTENT -->
# Get Channel Info

## General Information

- **Description:** Retrieves detailed information about a conversation.
- **Version:** 1.0.0
- **Group:** Channels
- **Scopes:** `channels:read`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_getchannelinfo`
- **Input Model:** `ActionInput_slack_getchannelinfo`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/get-channel-info.ts)


## Endpoint Reference

### Request Endpoint

`GET /channels/info`

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
  "channel?": "<unknown>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/get-channel-info.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/get-channel-info.md)

<!-- END  GENERATED CONTENT -->

