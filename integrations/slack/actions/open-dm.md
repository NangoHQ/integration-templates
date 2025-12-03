<!-- BEGIN GENERATED CONTENT -->
# Open Dm

## General Information

- **Description:** Opens a direct message or multi-person direct message.
- **Version:** 1.0.0
- **Group:** Conversations
- **Scopes:** `im:write, mpim:write`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_opendm`
- **Input Model:** `ActionInput_slack_opendm`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/open-dm.ts)


## Endpoint Reference

### Request Endpoint

`POST /conversations/dm/open`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "users": "<string>",
  "return_im?": "<boolean>"
}
```

### Request Response

```json
{
  "ok": "<boolean>",
  "channel": {
    "id": "<string>"
  }
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/open-dm.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/open-dm.md)

<!-- END  GENERATED CONTENT -->

