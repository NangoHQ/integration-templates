# Teams

## General Information
- **Description:** Fetches a list of teams from hackerrank work

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hackerrank-work/syncs/teams.ts)

### Request Endpoint

- **Path:** `/teams`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "name": "<string>",
  "owner": "<string>",
  "created_at": "<date>",
  "recruiter_count": "<number>",
  "developer_count": "<number>",
  "interviewer_count": "<number>",
  "recruiter_cap": "<number>",
  "developer_cap": "<number>",
  "interviewer_cap": "<number>",
  "logo_id": "<string>",
  "library_access": "<boolean>",
  "invite_as": "<string>",
  "locations": [
    "<string>"
  ],
  "departments": [
    "<string>"
  ]
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hackerrank-work/syncs/teams.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hackerrank-work/syncs/teams.md)

<!-- END  GENERATED CONTENT -->

undefined