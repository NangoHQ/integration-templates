<!-- BEGIN GENERATED CONTENT -->
# Create Candidate

## General Information

- **Description:** Action to create a candidate at the specified job
- **Version:** 2.0.0
- **Group:** Candidates
- **Scopes:** `w_candidates`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_workable_createcandidate`
- **Input Model:** `ActionInput_workable_createcandidate`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/workable/actions/create-candidate.ts)


## Endpoint Reference

### Request Endpoint

`POST /candidates`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "shortcode": "<string>",
  "candidate": {
    "name": "<string>",
    "firstname": "<string>",
    "lastname": "<string>",
    "email": "<string>",
    "headline": "<string>",
    "summary": "<string>",
    "address": "<string>",
    "phone": "<string>",
    "cover_letter": "<string>",
    "education_entries": [
      {
        "school": "<string>",
        "degree": "<string>",
        "field_of_study": "<string>",
        "start_date": "<string>",
        "end_date": "<string>"
      }
    ],
    "experience_entries": [
      {
        "title": "<string>",
        "summary": "<string>",
        "start_date": "<string>",
        "end_date": "<string>",
        "current": "<boolean>",
        "company": "<string>",
        "industry": "<string>"
      }
    ],
    "answers": [
      {
        "question_key": "<string>",
        "body": "<string>",
        "choices": "<string[]>",
        "checked": "<boolean>",
        "date": "<string>",
        "number": "<number>",
        "file": {
          "name": "<string>",
          "data": "<string>"
        }
      }
    ],
    "skills": "<string[]>",
    "tags": "<string[]>",
    "disqualified": "<boolean>",
    "disqualification_reason": "<string>",
    "disqualified_at": "<string>",
    "social_profiles": [
      {
        "type": "<string>",
        "name": "<string>",
        "username": "<string>",
        "url": "<string>"
      }
    ]
  },
  "domain": "<string>",
  "recruiter_key": "<string>"
}
```

### Request Response

```json
{
  "status": "<string>",
  "candidate": {
    "id": "<string>",
    "name": "<string>",
    "firstname": "<string>",
    "lastname": "<string>",
    "headline": "<string>",
    "account": {
      "subdomain": "<string>",
      "name": "<string>"
    },
    "job": {
      "shortcode": "<string>",
      "title": "<string>"
    },
    "stage": "<string>",
    "disqualified": "<boolean>",
    "disqualification_reason": "<string>",
    "hired_at": "<Date>",
    "sourced": "<boolean>",
    "profile_url": "<string>",
    "address": "<string>",
    "phone": "<string>",
    "email": "<string>",
    "domain": "<string>",
    "created_at": "<Date>",
    "updated_at": "<Date>",
    "image_url": "<string>",
    "outbound_mailbox": "<string>",
    "uploader_id": "<string>",
    "cover_letter": "<string>",
    "summary": "<string>",
    "education_entries": "<unknown[]>",
    "experience_entries": "<unknown[]>",
    "skills": "<unknown[]>",
    "answers": "<unknown[]>",
    "resume_url": "<string>",
    "tags": "<unknown[]>",
    "location": {
      "location_str": "<string>",
      "country": "<string>",
      "country_code": "<string>",
      "region": "<string>",
      "region_code": "<string>",
      "city": "<string>",
      "zip_code": "<string>"
    }
  }
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/workable/actions/create-candidate.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/workable/actions/create-candidate.md)

<!-- END  GENERATED CONTENT -->

