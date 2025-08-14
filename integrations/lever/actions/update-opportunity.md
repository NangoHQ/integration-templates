<!-- BEGIN GENERATED CONTENT -->
# Update Opportunity

## General Information

- **Description:** Update an opportunity
- **Version:** 1.0.0
- **Group:** Opportunities
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_lever_updateopportunity`
- **Input Model:** `ActionInput_lever_updateopportunity`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/lever/actions/update-opportunity.ts)


## Endpoint Reference

### Request Endpoint

`PATCH /opportunities`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "opportunityId": "<string>",
  "perform_as?": "<string>",
  "delete?": "<boolean>",
  "links": "<string[]>",
  "sources": "<string[]>",
  "stage?": "<string>",
  "tags": "<string[]>",
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
    "emails?": "<string[]>",
    "phones?": "<string[]>",
    "confidentiality?": "<string>",
    "location?": "<string>",
    "links?": "<string[]>",
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
        "0": {
          "toStageId": "<string>",
          "toStageIndex": "<number>",
          "updatedAt": "<number>",
          "userId": "<string>"
        },
        "1": "<string>"
      }
    ],
    "owner?": "<string>",
    "tags?": "<string[]>",
    "sources?": "<string[]>",
    "origin?": "<string>",
    "sourcedBy?": "<string>",
    "applications?": "<string[]>",
    "resume?": "<string>",
    "followers?": "<string[]>",
    "urls?": {
      "list?": "<string>",
      "show?": "<string>"
    },
    "dataProtection?": "<{} | <null>>",
    "isAnonymized?": "<boolean>",
    "opportunityLocation?": "<string>"
  }
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever/actions/update-opportunity.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever/actions/update-opportunity.md)

<!-- END  GENERATED CONTENT -->

