# Opportunities Feedbacks

## General Information
- **Description:** Fetches a list of all feedback forms for a candidate for every single opportunity

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: feedback:read:admin
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/lever-sandbox/syncs/opportunities-feedbacks.ts)

### Request Endpoint

- **Path:** `/opportunities/feedback`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "type": "<string>",
  "text": "<string>",
  "instructions": "<string>",
  "fields": [
    "<string>"
  ],
  "baseTemplateId": "<string>",
  "interview": "<string>",
  "panel": "<string>",
  "user": "<string>",
  "createdAt": "<number>",
  "completedAt": "<number>",
  "updatedAt": "<number>",
  "deletedAt": "<number>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever-sandbox/syncs/opportunities-feedbacks.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever-sandbox/syncs/opportunities-feedbacks.md)

<!-- END  GENERATED CONTENT -->







undefined