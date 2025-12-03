<!-- BEGIN GENERATED CONTENT -->
# Set Channel Purpose

## General Information

- **Description:** Updates a channel's description or purpose.
- **Version:** 1.0.0
- **Group:** Channels
- **Scopes:** `channels:write`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_setchannelpurpose`
- **Input Model:** `ActionInput_slack_setchannelpurpose`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/set-channel-purpose.ts)


## Endpoint Reference

### Request Endpoint

`POST /channels/purpose`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "channel_id": "<string>",
  "purpose": "<string>"
}
```

### Request Response

```json
{
  "ok": "<boolean>",
  "purpose": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/set-channel-purpose.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/set-channel-purpose.md)

<!-- END  GENERATED CONTENT -->

