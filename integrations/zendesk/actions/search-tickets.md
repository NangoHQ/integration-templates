# Search Tickets

## General Information

- **Description:** An action that performs a search for tickets in Zendesk based on the specified filter. It can take up to a few minutes for new tickets and users to be indexed for search. If new resources don't appear in your search results, wait a few minutes and try again.

- **Version:** 1.0.1
- **Group:** Others
- **Scopes:**: read
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/zendesk/actions/search-tickets.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** /search-tickets
- **Method:** GET

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "query": "<string>"
}
```

### Request Response

```json
{
  "tickets": [
    {
      "id": "<string>",
      "url": "<string>",
      "external_id": "<string | null>",
      "requester_id": "<string>",
      "requester_name": "<string>",
      "assignee_id": "<string | null>",
      "assignee_name": "<string | null>",
      "assignee_avatar": "<string | null>",
      "status": "<string>",
      "created_at": "<string>",
      "updated_at": "<string>",
      "is_public": "<boolean>",
      "subject": "<string | null>",
      "description": "<string>",
      "priority": "<string | null>",
      "tags": [
        "<string>"
      ]
    }
  ]
}
```
