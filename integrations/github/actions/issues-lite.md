# Issues Lite

## General Information
- **Description:** Fetches Github issues but up to a maximum of 15

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: public_repo
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/github/syncs/issues-lite.ts)

### Request Endpoint

- **Path:** `/github/issues-lite`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<integer>",
  "owner": "<string>",
  "repo": "<string>",
  "issue_number": "<number>",
  "title": "<string>",
  "author": "<string>",
  "author_id": "<string>",
  "state": "<string>",
  "date_created": "<date>",
  "date_last_modified": "<date>",
  "body": "<string>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/github/syncs/issues-lite.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/github/syncs/issues-lite.md)

<!-- END  GENERATED CONTENT -->

undefined