<!-- BEGIN GENERATED CONTENT -->
# Get Reactions

## General Information

- **Description:** Gets all reactions for a single message or file.
- **Version:** 1.0.0
- **Group:** Actions
- **Scopes:** `reactions:read`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_getreactions`
- **Input Model:** `ActionInput_slack_getreactions`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/get-reactions.ts)


## Endpoint Reference

### Request Endpoint

`GET /get-reactions`

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
  "ok": "<boolean>",
  "type?": "<string>",
  "message?": "<unknown>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/get-reactions.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/get-reactions.md)

<!-- END  GENERATED CONTENT -->

