# Service Tickets

## General Information
- **Description:** Fetches a list of service tickets from Hubspot

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hubspot/syncs/service-tickets.ts)

### Request Endpoint

- **Path:** `/service-tickets`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<integer>",
  "createdAt": "<date>",
  "updatedAt": "<date>",
  "isArchived": "<boolean>",
  "subject": "<string>",
  "content": "<string>",
  "objectId": "<integer>",
  "ownerId": "<integer>",
  "pipeline": "<integer>",
  "pipelineStage": "<integer>",
  "ticketCategory": "<string | null>",
  "ticketPriority": "<string>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/syncs/service-tickets.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/syncs/service-tickets.md)

<!-- END  GENERATED CONTENT -->

undefined