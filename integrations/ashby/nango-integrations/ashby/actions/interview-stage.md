<!-- BEGIN GENERATED CONTENT -->
# Interview Stage

## General Information

- **Description:** List all interview stages for an interview plan in order.

- **Version:** 0.0.1
- **Group:** Interviews
- **Scopes:** `interviewsRead`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/ashby/actions/interview-stage.ts)


## Endpoint Reference

### Request Endpoint

`GET /interviews/stages`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "interviewPlanId": "<string>"
}
```

### Request Response

```json
{
  "stages": [
    {
      "id": "<string>",
      "title": "<string>",
      "type": "<string>",
      "orderInInterviewPlan": "<number>",
      "interviewStageGroupId?": "<string>",
      "interviewPlanId": "<string>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/ashby/actions/interview-stage.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/ashby/actions/interview-stage.md)

<!-- END  GENERATED CONTENT -->

