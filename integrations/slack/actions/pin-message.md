<!-- BEGIN GENERATED CONTENT -->
# Pin Message

## General Information

- **Description:** Pins a message to a channel.
- **Version:** 1.0.0
- **Group:** Actions
- **Scopes:** `pins:write`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_pinmessage`
- **Input Model:** `ActionInput_slack_pinmessage`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/pin-message.ts)


## Endpoint Reference

### Request Endpoint

`POST /pin-message`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "channel_id": "<string>",
  "message_ts": "<string>"
}
```

### Request Response

```json
{
  "ok": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/pin-message.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/pin-message.md)

<!-- END  GENERATED CONTENT -->

