# Conversations

## General Information

- **Description:** Fetches a list of conversations from Intercom

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** Sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/intercom/syncs/conversations.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `undefined`
- **Method:** `GET`

### Request Query Parameters

- **modified_after:** `(optional, string)` A timestamp (e.g., `2023-05-31T11:46:13.390Z`) used to fetch records modified after this date and time. If not provided, all records are returned. The modified_after parameter is less precise than cursor, as multiple records may share the same modification timestamp.
- **limit:** `(optional, integer)` The maximum number of records to return per page. Defaults to 100.
- **cursor:** `(optional, string)` A marker used to fetch records modified after a specific point in time.If not provided, all records are returned.Each record includes a cursor value found in _nango_metadata.cursor.Save the cursor from the last record retrieved to track your sync progress.Use the cursor parameter together with the limit parameter to paginate through records.The cursor is more precise than modified_after, as it can differentiate between records with the same modification timestamp.
- **filter:** `(optional, added | updated | deleted)` Filter to only show results that have been added or updated or deleted.

### Request Body

_No request body_

### Request Response

```json
{
  "0": {
    "id": "<string>",
    "created_at": "<string>",
    "updated_at": "<string>",
    "waiting_since": "<string | null>",
    "snoozed_until": "<string | null>",
    "title": "<string | null>",
    "contacts": {
      "0": {
        "contact_id": "<string>"
      }
    },
    "state": "<string>",
    "open": "<boolean>",
    "read": "<boolean>",
    "priority": "<string>"
  },
  "1": {
    "id": "<string>",
    "conversation_id": "<string>",
    "body": "<string>",
    "type": "<string>",
    "created_at": "<string>",
    "updated_at": "<string>",
    "author": {
      "type": "<string>",
      "name": "<string>",
      "id": "<string>"
    }
  }
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/intercom/syncs/conversations.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/intercom/syncs/conversations.md)

<!-- END  GENERATED CONTENT -->
