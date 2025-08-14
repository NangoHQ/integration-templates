<!-- BEGIN GENERATED CONTENT -->
# Create Opportunity

## General Information

- **Description:** Create an opportunity and optionally candidates associated with the opportunity
- **Version:** 2.0.0
- **Group:** Opportunities
- **Scopes:** `opportunities:write:admin`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_lever_createopportunity`
- **Input Model:** `ActionInput_lever_createopportunity`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/lever/actions/create-opportunity.ts)


## Endpoint Reference

### Request Endpoint

`POST /opportunities`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "perform_as": "<string>",
  "parse": "<boolean>",
  "perform_as_posting_owner": "<boolean>",
  "name": "<string>",
  "headline": "<string>",
  "stage": "<string>",
  "location": "<string>",
  "phones": [
    {
      "value": "<string>",
      "type": "<string>"
    }
  ],
  "emails": "<string>",
  "links": "<string[]>",
  "tags": "<string[]>",
  "sources": "<string[]>",
  "origin": "<string>",
  "owner": "<string>",
  "followers": "<string[]>",
  "postings": "<string[]>",
  "createdAt": "<number>",
  "archived": {
    "archivedAt": "<number>",
    "reason": "<string>"
  },
  "contact": "<string[]>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "name": "<string>",
  "headline": "<string>",
  "contact": "<string>",
  "emails": "<string[]>",
  "phones": "<string[]>",
  "confidentiality": "<string>",
  "location": "<string>",
  "links": "<string[]>",
  "archived": {
    "reason": "<string>",
    "archivedAt": "<number>"
  },
  "createdAt": "<number>",
  "updatedAt": "<number>",
  "lastInteractionAt": "<number>",
  "lastAdvancedAt": "<number>",
  "snoozedUntil": "<number>",
  "archivedAt": "<number>",
  "archiveReason": "<string>",
  "stage": "<string>",
  "stageChanges": "<string[]>",
  "owner": "<string>",
  "tags": "<string[]>",
  "sources": "<string[]>",
  "origin": "<string>",
  "sourcedBy": "<string>",
  "applications": "<string[]>",
  "resume": "<string>",
  "followers": "<string[]>",
  "urls": {
    "list": "<string>",
    "show": "<string>"
  },
  "dataProtection": {},
  "isAnonymized": "<boolean>",
  "opportunityLocation": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever/actions/create-opportunity.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever/actions/create-opportunity.md)

<!-- END  GENERATED CONTENT -->

