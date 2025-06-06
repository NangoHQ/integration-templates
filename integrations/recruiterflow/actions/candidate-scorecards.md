<!-- BEGIN GENERATED CONTENT -->
# Candidate Scorecards

## General Information

- **Description:** Fetches all candidate scorecards from RecruiterFlow
- **Version:** 1.0.1
- **Group:** Candidates
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `RecruiterFlowCandidateScorecard`
- **Input Model:** `RecruiterFlowCandidateScorecardInput`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/recruiterflow/actions/candidate-scorecards.ts)


## Endpoint Reference

### Request Endpoint

`GET /candidate-scorecards`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id": "<string>",
  "job_id": "<string>"
}
```

### Request Response

```json
{
  "candidate": {
    "id": "<number>",
    "name": "<string>",
    "first_name?": "<string | undefined>"
  },
  "job": [
    {
      "id": "<number>",
      "name": "<string>",
      "stages": [
        {
          "id": "<number>",
          "name": "<string>",
          "scorecard": [
            {
              "attributes": [
                {
                  "category": {
                    "name": "<string>"
                  },
                  "name": "<string>",
                  "notes": "<string | undefined>",
                  "rank": "<number>",
                  "rating": "<number>"
                }
              ],
              "bottomline": "<string>",
              "first_name": "<string>",
              "id": "<number>",
              "last_name": "<string>",
              "middle_name": "<string>",
              "name": "<string>",
              "notes": "<string | undefined>",
              "questions": [
                {
                  "category_name": "<string>",
                  "id": "<number>",
                  "response": "<string>",
                  "text": "<string>"
                }
              ],
              "result_id": "<number>",
              "submission_time": "<string>",
              "user_id": "<number>"
            }
          ]
        }
      ]
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/recruiterflow/actions/candidate-scorecards.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/recruiterflow/actions/candidate-scorecards.md)

<!-- END  GENERATED CONTENT -->

