<!-- BEGIN GENERATED CONTENT -->
# Job Pipelines

## General Information

- **Description:** Fetches all job pipelines from RecruiterFlow
- **Version:** 1.0.1
- **Group:** Jobs
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `RecruiterFlowJobPipeline`
- **Input Model:** `RecruiterFlowPipelineInput`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/recruiterflow/actions/job-pipelines.ts)


## Endpoint Reference

### Request Endpoint

`GET /job-pipelines`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "job_id": "<string>"
}
```

### Request Response

```json
{
  "detail": [
    "<any>"
  ],
  "summary": [
    {
      "id": "<number>",
      "name": "<string>",
      "count": "<number>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/recruiterflow/actions/job-pipelines.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/recruiterflow/actions/job-pipelines.md)

<!-- END  GENERATED CONTENT -->

