<!-- BEGIN GENERATED CONTENT -->
# Add Reaction

## General Information

- **Description:** Adds an emoji reaction to a message.
- **Version:** 1.0.0
- **Group:** Reactions
- **Scopes:** `reactions:write`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_addreaction`
- **Input Model:** `ActionInput_slack_addreaction`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/add-reaction.ts)


## Endpoint Reference

### Request Endpoint

`POST /reactions`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "channel_id": "<string>",
  "message_ts": "<string>",
  "reaction_name": "<string>"
}
```

### Request Response

```json
{
  "ok": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/add-reaction.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/add-reaction.md)

<!-- END  GENERATED CONTENT -->

