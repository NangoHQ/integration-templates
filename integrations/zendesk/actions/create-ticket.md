# Create Ticket

## General Information

- **Description:** Create a Zendesk ticket
- **Version:** 1.0.1
- **Group:** Others
- **Scopes:**: tickets:write
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/zendesk/actions/create-ticket.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/tickets`
- **Method:** `POST`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "ticket": {
    "comment": {
      "body?": "<string>",
      "html_body?": "<string>"
    },
    "assignee_email?": "<string>",
    "assignee_id?": "<number>",
    "brand_id?": "<number>",
    "due_at?": "<string>",
    "type?": "<problem | incident | question | task>",
    "status?": "<new | open | pending | hold | solved | closed.>",
    "metadata?": {
      "__string": "<any>"
    }
  }
}
```

### Request Response

```json
{
  "id": "<string>",
  "url": "<string>",
  "created_at": "<string>",
  "updated_at": "<string>",
  "subject": "<string | null>",
  "description": "<string>",
  "priority": "<string | null>",
  "status": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zendesk/actions/create-ticket.ts)
-- [ReadMe History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zendesk/actions/create-ticket.md)
