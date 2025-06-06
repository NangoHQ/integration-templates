<!-- BEGIN GENERATED CONTENT -->
# Conversations

## General Information

- **Description:** List the conversations in the company in reverse chronological order.
- **Version:** 1.0.3
- **Group:** Conversations
- **Scopes:** _None_
- **Endpoint Type:** Sync
- **Model:** `Conversation`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/front/syncs/conversations.ts)


## Endpoint Reference

### Request Endpoint

`GET /conversations`

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
  "subject": "<string>",
  "status": "<archived | unassigned | deleted | assigned>",
  "assignee": "<ConversationAssignee | null>",
  "recipient": "<ConversationRecipient | null>",
  "tags": {
    "0": {
      "id": "<string>",
      "name": "<string>",
      "description": "<string | null>",
      "highlight": "<string | null>",
      "is_private": "<boolean>",
      "is_visible_in_conversation_lists": "<boolean>",
      "created_at": "<string>",
      "updated_at": "<string>"
    }
  },
  "links": {
    "0": {
      "id": "<string>",
      "name": "<string>",
      "type": "<string>",
      "external_url": "<string>",
      "custom_fields": "<object>"
    }
  },
  "custom_fields": "<object>",
  "created_at": "<string>",
  "waiting_since": "<string>",
  "is_private": "<boolean>",
  "scheduled_reminders": {
    "0": {
      "created_at": "<string>",
      "scheduled_at": "<string>",
      "updated_at": "<string>"
    }
  }
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/front/syncs/conversations.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/front/syncs/conversations.md)

<!-- END  GENERATED CONTENT -->

