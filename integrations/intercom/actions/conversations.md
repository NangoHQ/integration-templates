# Conversations

## General Information
- **Description:** Fetches a list of conversations from Intercom

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/intercom/syncs/conversations.ts)

### Request Endpoint

- **Path:** `undefined`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

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

undefined