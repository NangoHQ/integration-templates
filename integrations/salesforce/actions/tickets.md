# Tickets

## General Information
- **Description:** Fetches a list of tickets from salesforce

- **Version:** 1.0.1
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/salesforce-sandbox/syncs/tickets.ts)

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
  "case_number": "<string>",
  "subject": "<string | null>",
  "account_id": "<string | null>",
  "account_name": "<string | null>",
  "contact_id": "<string | null>",
  "contact_name": "<string | null>",
  "owner_id": "<string>",
  "owner_name": "<string | null>",
  "priority": "<string>",
  "status": "<string>",
  "description": "<string | null>",
  "type": "<string | null>",
  "created_date": "<string>",
  "closed_date": "<string | null>",
  "origin": "<string | null>",
  "is_closed": "<boolean>",
  "is_escalated": "<boolean>",
  "conversation": [
    {
      "id": "<string>",
      "body": "<string>",
      "created_date": "<string>",
      "created_by": "<string>"
    }
  ],
  "last_modified_date": "<string>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce-sandbox/syncs/tickets.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce-sandbox/syncs/tickets.md)

<!-- END  GENERATED CONTENT -->



undefined