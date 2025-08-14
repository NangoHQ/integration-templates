<!-- BEGIN GENERATED CONTENT -->
# Create Interview

## General Information

- **Description:** Action to create an interview on hackerrank work
- **Version:** 2.0.0
- **Group:** Interviews
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_hackerrank_work_createinterview`
- **Input Model:** `ActionInput_hackerrank_work_createinterview`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hackerrank-work/actions/create-interview.ts)


## Endpoint Reference

### Request Endpoint

`POST /interviews`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id": "<string>",
  "status": "<string>",
  "created_at": "<Date>",
  "updated_at": "<Date>",
  "title": "<string>",
  "feedback": "<string>",
  "notes": "<string>",
  "metadata": {},
  "quickpad": "<boolean>",
  "ended_at": "<Date>",
  "timezone": "<string>",
  "interview_template_id": "<string>",
  "from": "<Date>",
  "to": "<Date>",
  "url": "<string>",
  "user": "<string>",
  "thumbs_up": "<boolean>",
  "resume_url": "<string>",
  "interviewers": "<string[]>",
  "candidate": {
    "name": "<string>",
    "email": "<string>"
  },
  "result_url": "<string>",
  "report_url": "<string>",
  "send_email": "<boolean>",
  "interview_metadata": {}
}
```

### Request Response

```json
{
  "id": "<string>",
  "status": "<string>",
  "created_at": "<Date>",
  "updated_at": "<Date>",
  "title": "<string>",
  "feedback": "<string>",
  "notes": "<string>",
  "metadata": {},
  "quickpad": "<boolean>",
  "ended_at": "<Date>",
  "timezone": "<string>",
  "interview_template_id": "<string>",
  "from": "<Date>",
  "to": "<Date>",
  "url": "<string>",
  "user": "<string>",
  "thumbs_up": "<boolean>",
  "resume_url": "<string>",
  "interviewers": "<string[]>",
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

