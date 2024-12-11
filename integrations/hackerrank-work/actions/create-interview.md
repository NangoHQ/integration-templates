# Create Interview

## General Information

- **Description:** Action to create an interview on hackerrank work

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** `undefined`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hackerrank-work/actions/create-interview.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/interviews`
- **Method:** `POST`

### Request Query Parameters

_No request parameters_

### Request Body

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
  "report_url": "<string>",
  "send_email": "<boolean>",
  "interview_metadata": "<object>"
}
```

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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hackerrank-work/actions/create-interview.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hackerrank-work/actions/create-interview.md)

<!-- END  GENERATED CONTENT -->

