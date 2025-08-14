<!-- BEGIN GENERATED CONTENT -->
# Fetch Projects

## General Information

- **Description:** Fetch all projects from Basecamp
- **Version:** 2.0.0
- **Group:** Projects
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_basecamp_fetchprojects`
- **Input Model:** `ActionInput_basecamp_fetchprojects`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/basecamp/actions/fetch-projects.ts)


## Endpoint Reference

### Request Endpoint

`GET /projects`

### Request Query Parameters

_No request parameters_

### Request Body

```json
"<null>"
```

### Request Response

```json
{
  "projects": [
    {
      "id": "<number>",
      "status": "<string>",
      "created_at": "<string>",
      "updated_at": "<string>",
      "name": "<string>",
      "description": "<string | null>",
      "purpose": "<string>",
      "clients_enabled": "<boolean>",
      "timesheet_enabled?": "<boolean>",
      "color?": "<string | null>",
      "last_needle_color?": "<string | null>",
      "last_needle_position?": "<string | null>",
      "previous_needle_position?": "<string | null>",
      "bookmark_url": "<string>",
      "url": "<string>",
      "app_url": "<string>",
      "dock": [
        {
          "id": "<number>",
          "title": "<string>",
          "name": "<string>",
          "enabled": "<boolean>",
          "position": "<number | null>",
          "url": "<string>",
          "app_url": "<string>"
        }
      ],
      "bookmarked": "<boolean>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/basecamp/actions/fetch-projects.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/basecamp/actions/fetch-projects.md)

<!-- END  GENERATED CONTENT -->

