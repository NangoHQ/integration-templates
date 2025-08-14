<!-- BEGIN GENERATED CONTENT -->
# Job Pipelines

## General Information

- **Description:** Fetches all job pipelines from RecruiterFlow
- **Version:** 2.0.0
- **Group:** Jobs
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_recruiterflow_jobpipelines`
- **Input Model:** `ActionInput_recruiterflow_jobpipelines`
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
  "detail": "<unknown[]>",
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

