<!-- BEGIN GENERATED CONTENT -->
# Create Opportunity

## General Information

- **Description:** Create an opportunity and optionally candidates associated with the opportunity

- **Version:** 1.0.0
- **Group:** Opportunities
- **Scopes:** `opportunities:write:admin`
- **Endpoint Type:** Action
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
  "parse": "<boolean | undefined>",
  "perform_as_posting_owner": "<boolean | undefined>",
  "name": "<string | undefined>",
  "headline": "<string | undefined>",
  "stage": "<string | undefined>",
  "location": "<string | undefined>",
  "phones": "<PhoneEntry[] | undefined>",
  "emails": "<string | undefined>",
  "links": "<string[] | undefined>",
  "tags": "<string[] | undefined>",
  "sources": "<string[] | undefined>",
  "origin": "<string | undefined>",
  "owner": "<string | undefined>",
  "followers": "<string[] | undefined>",
  "postings": "<string[] | undefined>",
  "createdAt": "<number | undefined>",
  "archived": "<ArchievedEntry | undefined>",
  "contact": "<string[] | undefined>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "name": "<string>",
  "headline": "<string>",
  "contact": "<string>",
  "emails": [
    "<string>"
  ],
  "phones": [
    "<string>"
  ],
  "confidentiality": "<string>",
  "location": "<string>",
  "links": [
    "<string>"
  ],
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
  "stageChanges": [
    "<string>"
  ],
  "owner": "<string>",
  "tags": [
    "<string>"
  ],
  "sources": [
    "<string>"
  ],
  "origin": "<string>",
  "sourcedBy": "<string>",
  "applications": [
    "<string>"
  ],
  "resume": "<string>",
  "followers": [
    "<string>"
  ],
  "urls": {
    "list": "<string>",
    "show": "<string>"
  },
  "dataProtection": "<object>",
  "isAnonymized": "<boolean>",
  "opportunityLocation": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever/actions/create-opportunity.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever/actions/create-opportunity.md)

<!-- END  GENERATED CONTENT -->

