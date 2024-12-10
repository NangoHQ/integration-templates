# List Conversations

## General Information
- **Description:** List the conversations in the company in reverse chronological order.
- **Version:** 1.0.1
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/front/syncs/list-conversations.ts)

### Request Endpoint

- **Path:** `/conversations`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

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


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/front/syncs/list-conversations.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/front/syncs/list-conversations.md)

<!-- END  GENERATED CONTENT -->

undefined