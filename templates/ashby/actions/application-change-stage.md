<!-- BEGIN GENERATED CONTENT -->
# Application Change Stage

## General Information

- **Description:** Action to change stage of an application.

- **Version:** 0.0.1
- **Group:** Applications
- **Scopes:** `candidatesWrite`
- **Endpoint Type:** Action
- **Model:** `AshbyResponse`
- **Input Model:** `ChangeStage`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/ashby/actions/application-change-stage.ts)


## Endpoint Reference

### Request Endpoint

`POST /applications/stage`

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

