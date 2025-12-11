<!-- BEGIN GENERATED CONTENT -->
# Invite To Channel

## General Information

- **Description:** Invites 1-1000 users to a public or private channel.
- **Version:** 1.0.0
- **Group:** Channels
- **Scopes:** `channels:write, groups:write, im:write, mpim:write`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_invitetochannel`
- **Input Model:** `ActionInput_slack_invitetochannel`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/invite-to-channel.ts)


## Endpoint Reference

### Request Endpoint

`POST /channels/invite`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "channel_id": "<string>",
  "user_ids": "<string>"
}
```

### Request Response

```json
{
  "ok": "<boolean>",
  "channel?": "<unknown>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/invite-to-channel.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/invite-to-channel.md)

<!-- END  GENERATED CONTENT -->

