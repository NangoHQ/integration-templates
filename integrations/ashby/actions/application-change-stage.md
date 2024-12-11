# Application Change Stage

## General Information

- **Description:** Action to change stage of an application.

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `candidatesWrite`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/ashby/actions/application-change-stage.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/applications/stage`
- **Method:** `POST`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "applicationId": "<string>",
  "interviewStageId": "<string>",
  "archiveReasonId?": "<string>"
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

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/ashby/actions/application-change-stage.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/ashby/actions/application-change-stage.md)

<!-- END  GENERATED CONTENT -->

