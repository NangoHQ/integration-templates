<!-- BEGIN GENERATED CONTENT -->
# Create Channel

## General Information

- **Description:** Creates a new public or private channel.
- **Version:** 1.0.0
- **Group:** Channels
- **Scopes:** `channels:manage`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_createchannel`
- **Input Model:** `ActionInput_slack_createchannel`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/create-channel.ts)


## Endpoint Reference

### Request Endpoint

`POST /channels`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "name": "<string>",
  "is_private?": "<boolean>"
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/create-channel.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/create-channel.md)

<!-- END  GENERATED CONTENT -->

