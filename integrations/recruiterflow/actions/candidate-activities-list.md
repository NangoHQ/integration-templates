<!-- BEGIN GENERATED CONTENT -->
# Candidate Activities List

## General Information

- **Description:** Syncs all candidate activities list from RecruiterFlow
- **Version:** 1.0.1
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
      "id": "<number>",
      "associated_entities?": "<RecruiterFlowCandidateActivityListAssociatedEntities | undefined>",
      "candidate_id": "<number>",
      "contact_id": "<number | null>",
      "interview_plan_id": "<number | null>",
      "is_custom": "<boolean>",
      "job_id": "<number | null>",
      "subject": "<string>",
      "text": "<string>",
      "time": "<string>",
      "type": {
        "id": "<number>",
        "name": "<string>"
      },
      "user": {
        "email": "<string>",
        "first_name": "<string>",
        "id": "<number>",
        "last_name": "<string>",
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

