<!-- BEGIN GENERATED CONTENT -->
# Upload Resume

## General Information

- **Description:** Upload a resume for a candidate. Allowed formats are .pdf, .doc, or .docx. The file size must not exceed 2MB.
- **Version:** 1.0.0
- **Group:** Candidates
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_gem_uploadresume`
- **Input Model:** `ActionInput_gem_uploadresume`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/gem/actions/upload-resume.ts)


## Endpoint Reference

### Request Endpoint

`POST /candidate-upload-resume`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "candidate_id": "<string>",
  "user_id": "<string>",
  "resume_file": "<string>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "candidate_id": "<string>",
  "created_at": "<number>",
  "user_id": "<string>",
  "filename": "<string>",
  "download_url": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gem/actions/upload-resume.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gem/actions/upload-resume.md)

<!-- END  GENERATED CONTENT -->

