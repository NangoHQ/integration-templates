# Interviews

## General Information
- **Description:** Fetches a list of interviews from hackerrank work

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hackerrank-work/syncs/interviews.ts)

### Request Endpoint

- **Path:** `/interviews`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "status": "<string>",
  "created_at": "<date>",
  "updated_at": "<date>",
  "title": "<string>",
  "feedback": "<string>",
  "notes": "<string>",
  "metadata": "<object>",
  "quickpad": "<boolean>",
  "ended_at": "<date>",
  "timezone": "<string>",
  "interview_template_id": "<string>",
  "from": "<date>",
  "to": "<date>",
  "url": "<string>",
  "user": "<string>",
  "thumbs_up": "<boolean>",
  "resume_url": "<string>",
  "interviewers": [
    "<string>"
  ],
  "candidate": {
    "name": "<string>",
    "email": "<string>"
  },
  "result_url": "<string>",
  "report_url": "<string>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hackerrank-work/syncs/interviews.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hackerrank-work/syncs/interviews.md)

<!-- END  GENERATED CONTENT -->

undefined