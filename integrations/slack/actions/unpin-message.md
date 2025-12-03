<!-- BEGIN GENERATED CONTENT -->
# Unpin Message

## General Information

- **Description:** Removes a pinned item from a channel.
- **Version:** 1.0.0
- **Group:** Actions
- **Scopes:** `pins:write`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_unpinmessage`
- **Input Model:** `ActionInput_slack_unpinmessage`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/unpin-message.ts)


## Endpoint Reference

### Request Endpoint

`POST /unpin-message`

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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/unpin-message.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/unpin-message.md)

<!-- END  GENERATED CONTENT -->

