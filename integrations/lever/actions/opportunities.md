# Opportunities

## General Information
- **Description:** Fetches all opportunities

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: opportunities:read:admin
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/lever-sandbox/syncs/opportunities.ts)

### Request Endpoint

- **Path:** `/opportunities`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

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


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever-sandbox/syncs/opportunities.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever-sandbox/syncs/opportunities.md)

<!-- END  GENERATED CONTENT -->







undefined