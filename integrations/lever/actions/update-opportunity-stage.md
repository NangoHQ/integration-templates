<!-- BEGIN GENERATED CONTENT -->
# Update Opportunity Stage

## General Information

- **Description:** Update the stage in an opportunity
- **Version:** 2.0.0
- **Group:** Opportunities
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_lever_updateopportunitystage`
- **Input Model:** `ActionInput_lever_updateopportunitystage`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/lever/actions/update-opportunity-stage.ts)


## Endpoint Reference

### Request Endpoint

`POST /opportunities/stages`

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
  "response": {
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
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever/actions/update-opportunity-stage.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever/actions/update-opportunity-stage.md)

<!-- END  GENERATED CONTENT -->

