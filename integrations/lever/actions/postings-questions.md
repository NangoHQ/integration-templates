# Postings Questions

## General Information
- **Description:** Fetches a list of all questions included in a posting’s application form in Lever

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: postings:read:admin
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/lever-sandbox/syncs/postings-questions.ts)

### Request Endpoint

- **Path:** `/postings/questions`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "text": "<string>",
  "customQuestions": [
    "<string>"
  ],
  "eeoQuestions": [
    "<string>"
  ],
  "personalInformation": [
    "<string>"
  ],
  "urls": [
    "<string>"
  ]
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever-sandbox/syncs/postings-questions.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever-sandbox/syncs/postings-questions.md)

<!-- END  GENERATED CONTENT -->







undefined