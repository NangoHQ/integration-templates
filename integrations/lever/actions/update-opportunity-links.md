<!-- BEGIN GENERATED CONTENT -->
# Update Opportunity Links

## General Information

- **Description:** Update the links in an opportunity

- **Version:** 1.0.1
- **Group:** Opportunities
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `SuccessResponse`
- **Input Model:** `UpdateLinks`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/lever/actions/update-opportunity-links.ts)


## Endpoint Reference

### Request Endpoint

`POST /opportunities/links`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "perform_as?": "<string>",
  "links": [
    "<string>"
  ],
  "opportunityId": "<string>",
  "delete": "<boolean>"
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever/actions/update-opportunity-links.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever/actions/update-opportunity-links.md)

<!-- END  GENERATED CONTENT -->

