<!-- BEGIN GENERATED CONTENT -->
# Remove From Channel

## General Information

- **Description:** Removes a user from a channel.
- **Version:** 1.0.0
- **Group:** Channels
- **Scopes:** `channels:write`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_removefromchannel`
- **Input Model:** `ActionInput_slack_removefromchannel`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/remove-from-channel.ts)


## Endpoint Reference

### Request Endpoint

`POST /channels/members/remove`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "channel_id": "<string>",
  "user_id": "<string>"
}
```

### Request Response

```json
{
  "ok": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/remove-from-channel.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/remove-from-channel.md)

<!-- END  GENERATED CONTENT -->

