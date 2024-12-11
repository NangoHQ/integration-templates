<!-- BEGIN GENERATED CONTENT -->
# Update Opportunity Archived

## General Information

- **Description:** Update the archived state of an opportunity

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/lever-sandbox/actions/update-opportunity-archived.ts)


## Endpoint Reference

### Request Endpoint

`PUT /opportunities/archived`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "perform_as?": "<string>",
  "reason": "<string>",
  "requisitionId?": "<string>",
  "opportunityId": "<string>",
  "cleanInterviews?": "<boolean>"
}
```

### Request Response

```json
{
  "success": "<boolean>",
  "opportunityId?": "<string>",
  "response?": {
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
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever-sandbox/actions/update-opportunity-archived.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever-sandbox/actions/update-opportunity-archived.md)

<!-- END  GENERATED CONTENT -->

