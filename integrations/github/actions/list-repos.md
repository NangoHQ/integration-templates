# List Repos

## General Information

- **Description:** List github repos from an organization.

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: read:org
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/github/actions/list-repos.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/github/list-repos`
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
  "name": "<string>",
  "full_name": "<string>",
  "description": "<string>",
  "url": "<string>",
  "date_created": "<date>",
  "date_last_modified": "<date>"
}
```
