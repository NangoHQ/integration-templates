# Create Candidate

## General Information

- **Description:** Action to create a candidate at the specified job

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: w_candidates
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/workable/actions/create-candidate.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/candidates`
- **Method:** `POST`

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
    "headline": "<string | undefined>",
    "summary": "<string | undefined>",
    "address": "<string | undefined>",
    "phone": "<string | undefined>",
    "cover_letter": "<string | undefined>",
    "education_entries": "<EducationEntry[] | undefined>",
    "experience_entries": "<ExperienceEntry[] | undefined>",
    "answers": "<Answer[] | undefined>",
    "skills": "<string[] | undefined>",
    "tags": "<string[] | undefined>",
    "disqualified": "<boolean | undefined>",
    "disqualification_reason": "<string | undefined>",
    "disqualified_at": "<string | undefined>",
    "social_profiles": "<SocialProfile[] | undefined>"
  },
  "domain": "<string | undefined>",
  "recruiter_key": "<string | undefined>"
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
    "hired_at": "<date>",
    "sourced": "<boolean>",
    "profile_url": "<string>",
    "address": "<string>",
    "phone": "<string>",
    "email": "<string>",
    "domain": "<string>",
    "created_at": "<date>",
    "updated_at": "<date>",
    "image_url": "<string>",
    "outbound_mailbox": "<string>",
    "uploader_id": "<string>",
    "cover_letter": "<string>",
    "summary": "<string>",
    "education_entries": {},
    "experience_entries": {},
    "skills": {},
    "answers": {},
    "resume_url": "<string>",
    "tags": {},
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

