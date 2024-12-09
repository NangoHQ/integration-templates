# Messages

## General Information

- **Description:** Syncs Slack messages, thread replies and reactions from messages &
thread replies for all channels, group dms and dms the bot is a part
of. For every channel it will do an initial full sync on first
detection of the channel. For subsequent runs it will sync messages,
threads & reactions from the last 10 days. Scopes required:
channels:read, and at least one of
channels:history, groups:history, mpim:history, im:history

- **Version:** 1.0.1
- **Group:** Others
- **Scopes:**: channels:read,channels:history
- **Endpoint Type:** Sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/syncs/messages.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** undefined
- **Method:** GET
