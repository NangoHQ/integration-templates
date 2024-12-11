<!-- BEGIN GENERATED CONTENT -->
# Update Opportunity Sources

## General Information

- **Description:** Update the sources in an opportunity

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** `undefined`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/lever-sandbox/actions/update-opportunity-sources.ts)


## Endpoint Reference

### Request Endpoint

`POST /opportunities/sources`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "opportunityId": "<string>",
  "perform_as?": "<string>",
  "sources": [
    "<string>"
  ],
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever-sandbox/actions/update-opportunity-sources.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever-sandbox/actions/update-opportunity-sources.md)

<!-- END  GENERATED CONTENT -->

