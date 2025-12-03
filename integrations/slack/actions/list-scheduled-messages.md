<!-- BEGIN GENERATED CONTENT -->
# List Scheduled Messages

## General Information

- **Description:** Retrieves pending scheduled messages from workspace.
- **Version:** 1.0.0
- **Group:** Messages
- **Scopes:** `chat:write`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_listscheduledmessages`
- **Input Model:** `ActionInput_slack_listscheduledmessages`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/list-scheduled-messages.ts)


## Endpoint Reference

### Request Endpoint

`GET /messages/scheduled`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "channel_id?": "<string>",
  "latest_ts?": "<number>",
  "oldest_ts?": "<number>"
}
```

### Request Response

```json
{
  "ok": "<boolean>",
  "scheduled_messages": "<unknown[]>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/list-scheduled-messages.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/list-scheduled-messages.md)

<!-- END  GENERATED CONTENT -->

