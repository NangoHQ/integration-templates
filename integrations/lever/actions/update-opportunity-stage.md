# Update Opportunity Stage

## General Information

- **Description:** Update the stage in an opportunity

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/lever-sandbox/actions/update-opportunity-stage.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/opportunities/stages`
- **Method:** `POST`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "perform_as?": "<string>",
  "stage": "<string>",
  "opportunityId": "<string>"
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever-sandbox/actions/update-opportunity-stage.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever-sandbox/actions/update-opportunity-stage.md)

<!-- END  GENERATED CONTENT -->

