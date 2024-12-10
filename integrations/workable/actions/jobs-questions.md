# Jobs Questions

## General Information
- **Description:** Fetches a list of questions for the specified job from workable

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: r_jobs
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/workable/syncs/jobs-questions.ts)

### Request Endpoint

- **Path:** `/workable/jobs-questions`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "body": "<string>",
  "type": "<string>",
  "required": "<boolean>",
  "single_answer": "<boolean>",
  "choices": {
    "id": "<string>",
    "body": "<string>"
  },
  "supported_file_types": {},
  "max_file_size": "<number>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/workable/syncs/jobs-questions.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/workable/syncs/jobs-questions.md)

<!-- END  GENERATED CONTENT -->

undefined