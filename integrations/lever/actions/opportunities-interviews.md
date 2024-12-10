# Opportunities Interviews

## General Information
- **Description:** Fetches a list of all interviews for every single opportunity

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: interviews:read:admin
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/lever-sandbox/syncs/opportunities-interviews.ts)

### Request Endpoint

- **Path:** `/opportunities/interviews`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "panel": "<string>",
  "subject": "<string>",
  "note": "<string>",
  "interviewers": [
    "<string>"
  ],
  "timezone": "<string>",
  "createdAt": "<number>",
  "date": "<number>",
  "duration": "<number>",
  "location": "<string>",
  "feedbackTemplate": "<string>",
  "feedbackForms": [
    "<string>"
  ],
  "feedbackReminder": "<string>",
  "user": "<string>",
  "stage": "<string>",
  "canceledAt": "<number>",
  "postings": [
    "<string>"
  ],
  "gcalEventUrl": "<string>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever-sandbox/syncs/opportunities-interviews.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever-sandbox/syncs/opportunities-interviews.md)

<!-- END  GENERATED CONTENT -->







undefined