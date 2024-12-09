# Application Change Source

## General Information

- **Description:** Action to change source of application.

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: candidatesWrite
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/ashby/actions/application-change-source.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** /applications/source
- **Method:** POST

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "applicationId": "<string>",
  "sourceId": "<string>"
}
```

### Request Response

```json
{
  "success": "<boolean>",
  "errors?": [
    "<string>"
  ],
  "results?": "<AshByApplicationSuccessObject | AshbyCreateCandidateResponse | InterviewStageListResponse>",
  "moreDataAvailable?": "<boolean>"
}
```
