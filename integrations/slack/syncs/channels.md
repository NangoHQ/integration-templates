# Channels

## General Information

- **Description:** Syncs information about all Slack channels. Which channels get synced
(public, private, IMs, group DMs) depends on the scopes. If
joinPublicChannels is set to true, the bot will automatically join all
public channels as well. Scopes: At least one of channels:read,
groups:read, mpim:read, im:read. To also join public channels:
channels:join

- **Version:** 1.0.1
- **Group:** Others
- **Scopes:**: channels:read,channels:join
- **Endpoint Type:** Sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/syncs/channels.ts)
