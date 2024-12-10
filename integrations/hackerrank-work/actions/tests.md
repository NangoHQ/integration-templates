# Tests

## General Information
- **Description:** Fetches a list of tests from hackerrank work

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hackerrank-work/syncs/tests.ts)

### Request Endpoint

- **Path:** `/tests`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

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


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hackerrank-work/syncs/tests.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hackerrank-work/syncs/tests.md)

<!-- END  GENERATED CONTENT -->

undefined