# Create Test

## General Information

- **Description:** Action to create a test on hackerrank work

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** `undefined`
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hackerrank-work/actions/create-test.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/tests`
- **Method:** `POST`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "name": "<string>",
  "starttime": "<Date>",
  "endtime": "<Date>",
  "duration": "<number>",
  "instructions": "<string>",
  "locked": "<boolean>",
  "draft": "<string>",
  "languages": [
    "<string>"
  ],
  "candidate_details": [
    "<string>"
  ],
  "custom_acknowledge_text": "<string>",
  "cutoff_score": "<number>",
  "master_password": "<string>",
  "hide_compile_test": "<boolean>",
  "tags": [
    "<string>"
  ],
  "role_ids": [
    "<string>"
  ],
  "experience": [
    "<string>"
  ],
  "questions": [
    "<string>"
  ],
  "mcq_incorrect_score": "<number>",
  "mcq_correct_score": "<number>",
  "secure": "<boolean>",
  "shuffle_questions": "<boolean>",
  "test_admins": [
    "<string>"
  ],
  "hide_template": "<boolean>",
  "enable_acknowledgement": "<boolean>",
  "enable_proctoring": "<boolean>",
  "candidate_tab_switch": "<boolean>",
  "track_editor_paste": "<boolean>",
  "show_copy_paste_prompt": "<boolean>",
  "ide_config": "<string>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "unique_id": "<string>",
  "name": "<string>",
  "duration": "<number>",
  "owner": "<string>",
  "instructions": "<string>",
  "created_at": "<date>",
  "state": "<string>",
  "locked": "<boolean>",
  "test_type": "<string>",
  "starred": "<boolean>",
  "start_time": "<date>",
  "end_time": "<date>",
  "draft": "<boolean>",
  "questions": [
    "<string>"
  ],
  "sections": "<object>",
  "tags": [
    "<string>"
  ],
  "permission": "<number>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hackerrank-work/actions/create-test.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hackerrank-work/actions/create-test.md)

<!-- END  GENERATED CONTENT -->
