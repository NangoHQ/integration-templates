<!-- BEGIN GENERATED CONTENT -->
# Candidate Activities List

## General Information

- **Description:** Fetches all candidate activities list from RecruiterFlow
- **Version:** 2.0.0
- **Group:** Candidates
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `RecruiterFlowCandidateActivityListOutput`
- **Input Model:** `RecruiterFlowCandidateActivityListInput`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/recruiterflow/actions/candidate-activities-list.ts)


## Endpoint Reference

### Request Endpoint

`GET /candidate-activities-list`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id": "<string>"
}
```

### Request Response

```json
{
  "data": [
    {
      "activity_id": "<number | null>",
      "associated_entities?": "<RecruiterFlowCandidateActivityListAssociatedEntities | undefined | null>",
      "candidate_id": "<number | null>",
      "contact_id": "<number | null>",
      "interview_plan_id": "<number | null>",
      "is_custom": "<boolean>",
      "job_id": "<number | null>",
      "subject": "<string>",
      "text": "<string>",
      "time": "<string>",
      "type": {
        "id": "<number>",
        "name": "<string | null>"
      },
      "user": {
        "email": "<string | null>",
        "first_name": "<string | null>",
        "id": "<number | null>",
        "last_name": "<string | null>",
        "name": "<string>"
      }
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/recruiterflow/actions/candidate-activities-list.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/recruiterflow/actions/candidate-activities-list.md)

<!-- END  GENERATED CONTENT -->

