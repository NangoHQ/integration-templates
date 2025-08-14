<!-- BEGIN GENERATED CONTENT -->
# Update Application

## General Information

- **Description:** Update an application's source
- **Version:** 1.0.0
- **Group:** Applications
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_gem_updateapplication`
- **Input Model:** `ActionInput_gem_updateapplication`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/gem/actions/update-application.ts)


## Endpoint Reference

### Request Endpoint

`PATCH /application`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "source_id": "<string>",
  "application_id": "<string>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "candidate_id": "<string>",
  "applied_at": "<string>",
  "rejected_at": "<string | null>",
  "last_activity_at": "<string>",
  "source": {
    "id": "<string>",
    "public_name": "<string>"
  },
  "credited_to": "<string>",
  "rejection_reason": "<{\"id\":\"<string>\",\"name\":\"<string>\",\"type\":{\"id\":\"<string>\",\"name\":\"<string>\"}} | <null>>",
  "jobs": [
    {
      "id": "<string>",
      "name": "<string>"
    }
  ],
  "job_post_id": "<string>",
  "status": "<string>",
  "current_stage": {
    "id": "<string>",
    "name": "<string>"
  },
  "deleted_at": "<string | null>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gem/actions/update-application.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gem/actions/update-application.md)

<!-- END  GENERATED CONTENT -->

