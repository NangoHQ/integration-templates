<!-- BEGIN GENERATED CONTENT -->
# Send Message

## General Information

- **Description:** An action that sends a message to a slack channel.

- **Version:** 1.0.2
- **Group:** Messages
- **Scopes:** `chat:write`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/send-message.ts)


## Endpoint Reference

### Request Endpoint

`POST /messages`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "channel": "<string>",
  "text": "<string>"
}
```

### Request Response

```json
{
  "ok": "<boolean>",
  "channel?": "<string | undefined>",
  "ts?": "<string | undefined>",
  "message?": "<string | undefined>",
  "warning?": "<string | undefined>",
  "error?": "<string | undefined>",
  "raw_json": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/send-message.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/send-message.md)

<!-- END  GENERATED CONTENT -->

