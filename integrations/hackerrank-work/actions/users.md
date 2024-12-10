# Users

## General Information
- **Description:** Fetches a list of users from hackerrank work

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hackerrank-work/syncs/users.ts)

### Request Endpoint

- **Path:** `/users`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "email": "<string>",
  "firstname": "<string>",
  "lastname": "<string>",
  "country": "<string>",
  "role": "<string>",
  "status": "<string>",
  "phone": "<string>",
  "timezone": "<string>",
  "questions_permission": "<number>",
  "tests_permission": "<number>",
  "interviews_permission": "<number>",
  "candidates_permission": "<number>",
  "shared_questions_permission": "<number>",
  "shared_tests_permission": "<number>",
  "shared_interviews_permission": "<number>",
  "shared_candidates_permission": "<number>",
  "created_at": "<date>",
  "company_admin": "<boolean>",
  "team_admin": "<boolean>",
  "company_id": "<string>",
  "teams": {},
  "activated": "<boolean>",
  "last_activity_time": "<date>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hackerrank-work/syncs/users.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hackerrank-work/syncs/users.md)

<!-- END  GENERATED CONTENT -->

undefined