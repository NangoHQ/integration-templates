<!-- BEGIN GENERATED CONTENT -->
# Messages

## General Information

- **Description:** Continuously fetches messages from Microsoft Teams channels and chats.
Details: incremental sync, goes back 10 days on first sync, metadata tracks last sync per channel/chat.

- **Version:** 0.0.1
- **Group:** Messsages
- **Scopes:** `ChannelMessage.Read.All, Chat.Read.All`
- **Endpoint Type:** Sync
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/microsoft-teams/syncs/messages.ts)


## Endpoint Reference

### Request Endpoint

`GET /messages`

### Request Query Parameters

- **modified_after:** `(optional, string)` A timestamp (e.g., `2023-05-31T11:46:13.390Z`) used to fetch records modified after this date and time. If not provided, all records are returned. The modified_after parameter is less precise than cursor, as multiple records may share the same modification timestamp.
- **limit:** `(optional, integer)` The maximum number of records to return per page. Defaults to 100.
- **cursor:** `(optional, string)` A marker used to fetch records modified after a specific point in time.If not provided, all records are returned.Each record includes a cursor value found in _nango_metadata.cursor.Save the cursor from the last record retrieved to track your sync progress.Use the cursor parameter together with the limit parameter to paginate through records.The cursor is more precise than modified_after, as it can differentiate between records with the same modification timestamp.
- **filter:** `(optional, added | updated | deleted)` Filter to only show results that have been added or updated or deleted.
- **ids:** `(optional, string[])` An array of string containing a list of your records IDs. The list will be filtered to include only the records with a matching ID.

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "channelId": "<string | null>",
  "chatId": "<string | null>",
  "content": "<string | null>",
  "createdDateTime": "<string>",
  "lastModifiedDateTime": "<string | null>",
  "deletedDateTime": "<string | null>",
  "from": {
    "user": {
      "id": "<string | null>",
      "displayName": "<string | null>",
      "email": "<string | null>"
    }
  },
  "importance": "<string | null>",
  "messageType": "<string>",
  "subject": "<string | null>",
  "webUrl": "<string | null>",
  "attachments": "<TeamsMessageAttachment[] | null>",
  "reactions": "<TeamsMessageReaction[] | null>",
  "replies": "<TeamsMessageReply[] | null>",
  "raw_json": "<string>"
}
```

### Expected Metadata

```json
{
  "orgsToSync": [
    "<string>"
  ],
  "channelsLastSyncDate?": {
    "__string": "<string>"
  },
  "chatsLastSyncDate?": {
    "__string": "<string>"
  }
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/microsoft-teams/syncs/messages.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/microsoft-teams/syncs/messages.md)

<!-- END  GENERATED CONTENT -->

