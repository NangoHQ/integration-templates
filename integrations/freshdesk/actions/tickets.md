# Tickets

## General Information
- **Description:** Fetches the freshdesk tickets

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/freshdesk/syncs/tickets.ts)

### Request Endpoint

- **Path:** `/tickets`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "type": "<string>",
  "priority": "<number>",
  "request_id": "<number>",
  "response_id": "<number>",
  "source": "<number>",
  "subject": "<string>",
  "to_emails": "<string[] | null>",
  "created_at": "<string>",
  "updated_at": "<string>",
  "is_escalated": "<boolean>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/freshdesk/syncs/tickets.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/freshdesk/syncs/tickets.md)

<!-- END  GENERATED CONTENT -->

undefined