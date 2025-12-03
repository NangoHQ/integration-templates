<!-- BEGIN GENERATED CONTENT -->
# Remove Reaction

## General Information

- **Description:** Removes an emoji reaction from a message.
- **Version:** 1.0.0
- **Group:** Reactions
- **Scopes:** `reactions:write`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_removereaction`
- **Input Model:** `ActionInput_slack_removereaction`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/remove-reaction.ts)


## Endpoint Reference

### Request Endpoint

`POST /reactions/remove`

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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/remove-reaction.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/remove-reaction.md)

<!-- END  GENERATED CONTENT -->

