# Create Demo Issue

## General Information

- **Description:** Create a GitHub issue in Nango's showcase repository.

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/github/actions/create-demo-issue.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/github/create-demo-issue`
- **Method:** `POST`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "title": "<string>"
}
```

### Request Response

```json
{
  "url": "<string | undefined>",
  "status": "<number>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/github/actions/create-demo-issue.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/github/actions/create-demo-issue.md)
