<!-- BEGIN GENERATED CONTENT -->
# Get Archive Reasons

## General Information

- **Description:** Get all archived reasons

- **Version:** 0.0.1
- **Group:** Archived
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `SuccessResponse`
- **Input Model:** _None_
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/lever/actions/get-archive-reasons.ts)


## Endpoint Reference

### Request Endpoint

`GET /archived/reasons`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever/actions/get-archive-reasons.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever/actions/get-archive-reasons.md)

<!-- END  GENERATED CONTENT -->

