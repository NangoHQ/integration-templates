# Opportunities Applications

## General Information
- **Description:** Fetches a list of all applications for a candidate in Lever

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: applications:read:admin
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/lever-sandbox/syncs/opportunities-applications.ts)

### Request Endpoint

- **Path:** `/applications`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "opportunityId": "<string>",
  "candidateId": "<string>",
  "createdAt": "<number>",
  "type": "<string>",
  "posting": "<string>",
  "postingHiringManager": "<string>",
  "postingOwner": "<string>",
  "user": "<string>",
  "name": "<string>",
  "email": "<string>",
  "phone": {
    "type": "<string>",
    "value": "<string>"
  },
  "requisitionForHire": {
    "id": "<string>",
    "requisitionCode": "<string>",
    "hiringManagerOnHire": "<string>"
  },
  "ownerId": "<string>",
  "hiringManager": "<string>",
  "company": "<string>",
  "links": [
    "<string>"
  ],
  "comments": "<string>",
  "customQuestions": [
    "<string>"
  ],
  "archived": {
    "reason": "<string>",
    "archivedAt": "<number>"
  }
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever-sandbox/syncs/opportunities-applications.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever-sandbox/syncs/opportunities-applications.md)

<!-- END  GENERATED CONTENT -->







undefined