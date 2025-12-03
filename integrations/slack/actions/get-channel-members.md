<!-- BEGIN GENERATED CONTENT -->
# Get Channel Members

## General Information

- **Description:** Lists members of a conversation with pagination.
- **Version:** 1.0.0
- **Group:** Channels
- **Scopes:** `channels:read, groups:read, im:read, mpim:read`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_getchannelmembers`
- **Input Model:** `ActionInput_slack_getchannelmembers`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/get-channel-members.ts)


## Endpoint Reference

### Request Endpoint

`GET /channels/members`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "channel_id": "<string>",
  "limit?": "<number>",
  "cursor?": "<string>"
}
```

### Request Response

```json
{
  "ok": "<boolean>",
  "members": "<string[]>",
  "response_metadata?": {
    "next_cursor?": "<string>"
  }
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/get-channel-members.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/get-channel-members.md)

<!-- END  GENERATED CONTENT -->

