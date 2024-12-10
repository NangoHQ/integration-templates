# Update Opportunity

## General Information

- **Description:** Update an opportunity

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/lever-sandbox/actions/update-opportunity.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/opportunities`
- **Method:** `PATCH`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "opportunityId": "<string>",
  "perform_as?": "<string>",
  "delete?": "<boolean>",
  "links?": [
    "<string>"
  ],
  "sources?": [
    "<string>"
  ],
  "stage?": "<string>",
  "tags?": [
    "<string>"
  ],
  "reason?": "<string>",
  "cleanInterviews?": "<boolean>",
  "requisitionId?": "<string>"
}
```

### Request Response

```json
{
  "data": {
    "id?": "<string>",
    "name?": "<string>",
    "headline?": "<string>",
    "contact?": "<string>",
    "emails?": [
      "<string>"
    ],
    "phones?": [
      "<string>"
    ],
    "confidentiality?": "<string>",
    "location?": "<string>",
    "links?": [
      "<string>"
    ],
    "archived?": {
      "reason?": "<string>",
      "archivedAt?": "<number>"
    },
    "createdAt?": "<number>",
    "updatedAt?": "<number>",
    "lastInteractionAt?": "<number>",
    "lastAdvancedAt?": "<number>",
    "snoozedUntil?": "<number | null>",
    "archivedAt?": "<number>",
    "archiveReason?": "<string>",
    "stage?": "<string>",
    "stageChanges?": [
      {
        "toStageId": "<string>",
        "toStageIndex": "<number>",
        "updatedAt": "<number>",
        "userId": "<string>"
      }
    ],
    "owner?": "<string>",
    "tags?": [
      "<string>"
    ],
    "sources?": [
      "<string>"
    ],
    "origin?": "<string>",
    "sourcedBy?": "<string>",
    "applications?": [
      "<string>"
    ],
    "resume?": "<string>",
    "followers?": [
      "<string>"
    ],
    "urls?": {
      "list?": "<string>",
      "show?": "<string>"
    },
    "dataProtection?": "<object | null>",
    "isAnonymized?": "<boolean>",
    "opportunityLocation?": "<string>"
  }
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever-sandbox/actions/update-opportunity.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever-sandbox/actions/update-opportunity.md)
