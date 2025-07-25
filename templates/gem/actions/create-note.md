<!-- BEGIN GENERATED CONTENT -->
# Create Note

## General Information

- **Description:** Create a note for a candidate
- **Version:** 0.0.1
- **Group:** Candidates
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `Note`
- **Input Model:** `CreateNoteParams`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/gem/actions/create-note.ts)


## Endpoint Reference

### Request Endpoint

`POST /candidate-notes`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "user_id": "<string>",
  "body": "<string>",
  "visibility": "<private | public>",
  "candidate_id": "<string>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "created_at": "<string>",
  "body": "<string>",
  "user": {
    "id": "<string>",
    "name": "<string>",
    "first_name": "<string>",
    "last_name": "<string>",
    "employee_id": "<string>"
  },
  "private": "<boolean>",
  "visibility": "<public | private>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gem/actions/create-note.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gem/actions/create-note.md)

<!-- END  GENERATED CONTENT -->

