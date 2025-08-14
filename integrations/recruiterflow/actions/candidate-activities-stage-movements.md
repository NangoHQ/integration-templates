<!-- BEGIN GENERATED CONTENT -->
# Candidate Activities Stage Movements

## General Information

- **Description:** Fetches all candidate activities stage movements from RecruiterFlow
- **Version:** 2.0.0
- **Group:** Candidates
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_recruiterflow_candidateactivitiesstagemovements`
- **Input Model:** `ActionInput_recruiterflow_candidateactivitiesstagemovements`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/recruiterflow/actions/candidate-activities-stage-movements.ts)


## Endpoint Reference

### Request Endpoint

`GET /candidate-activities-stage-movements`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id": "<string>",
  "after?": "<string>",
  "before?": "<string>"
}
```

### Request Response

```json
{
  "data": [
    {
      "id": "<number>",
      "name": "<string>",
      "added_by": {
        "email": "<string>",
        "id": "<number>",
        "name": "<string>"
      },
      "transitions": [
        {
          "entered": "<string>",
          "from": "<string | null>",
          "left": "<string | null>",
          "stage_moved_by": {
            "email": "<string>",
            "id": "<number>",
            "name": "<string>"
          },
          "to": "<string>"
        }
      ]
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/recruiterflow/actions/candidate-activities-stage-movements.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/recruiterflow/actions/candidate-activities-stage-movements.md)

<!-- END  GENERATED CONTENT -->

