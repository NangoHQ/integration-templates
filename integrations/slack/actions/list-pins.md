<!-- BEGIN GENERATED CONTENT -->
# List Pins

## General Information

- **Description:** Lists all items pinned to a channel.
- **Version:** 1.0.0
- **Group:** Actions
- **Scopes:** `pins:read`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_listpins`
- **Input Model:** `ActionInput_slack_listpins`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/list-pins.ts)


## Endpoint Reference

### Request Endpoint

`GET /list-pins`

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
  "items": "<unknown[]>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/list-pins.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/list-pins.md)

<!-- END  GENERATED CONTENT -->

