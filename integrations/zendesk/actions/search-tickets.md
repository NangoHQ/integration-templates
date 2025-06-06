<!-- BEGIN GENERATED CONTENT -->
# Search Tickets

## General Information

- **Description:** An action that performs a search for tickets in Zendesk based on the specified filter. It can take up to a few minutes for new tickets and users to be indexed for search. If new resources don't appear in your search results, wait a few minutes and try again.

- **Version:** 1.0.2
- **Group:** Others
- **Scopes:** `read`
- **Endpoint Type:** Action
- **Model:** `SearchTicketOutput`
- **Input Model:** `SearchTicketInput`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/zendesk/actions/search-tickets.ts)


## Endpoint Reference

### Request Endpoint

`GET /search-tickets`

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

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zendesk/actions/search-tickets.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zendesk/actions/search-tickets.md)

<!-- END  GENERATED CONTENT -->

