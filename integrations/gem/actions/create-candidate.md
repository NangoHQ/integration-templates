<!-- BEGIN GENERATED CONTENT -->
# Create Candidate

## General Information

- **Description:** Create a new candidate in Gem
- **Version:** 1.0.0
- **Group:** Candidates
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_gem_createcandidate`
- **Input Model:** `ActionInput_gem_createcandidate`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/gem/actions/create-candidate.ts)


## Endpoint Reference

### Request Endpoint

`POST /candidates`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "created_by": "<string>",
  "first_name": "<string | null>",
  "last_name": "<string | null>",
  "nickname": "<string | null>",
  "emails": "<[{\"email_address\":\"<string>\",\"is_primary\":\"<boolean>\"}] | <null>>",
  "linked_in_handle": "<string | null>",
  "title": "<string | null>",
  "company": "<string | null>",
  "location": "<string | null>",
  "school": "<string | null>",
  "education_info": "<[{\"school?\":\"<string | null>\",\"parsed_university\":\"<string | null>\",\"parsed_school\":\"<string | null>\",\"start_date\":\"<string | null>\",\"end_date\":\"<string | null>\",\"field_of_study\":\"<string | null>\",\"parsed_major_1\":\"<string | null>\",\"parsed_major_2\":\"<string | null>\",\"degree\":\"<string | null>\"}] | <null>>",
  "work_info": "<[{\"company\":\"<string | null>\",\"title\":\"<string | null>\",\"work_start_date\":\"<string | null>\",\"work_end_date\":\"<string | null>\",\"is_current\":\"<boolean | null>\"}] | <null>>",
  "profile_urls": "<<string[]> | <null>>",
  "custom_fields": "<[{\"custom_field_id\":\"<string>\",\"value\":\"<string>\"}] | <null>>",
  "phone_number": "<string | null>",
  "project_ids": "<<string[]> | <null>>",
  "sourced_from": "<string | null>",
  "autofill": "<boolean>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "created_at": "<number>",
  "created_by": "<string>",
  "last_updated_at": "<number | null>",
  "candidate_greenhouse_id": "<string | null>",
  "first_name": "<string | null>",
  "last_name": "<string | null>",
  "nickname": "<string | null>",
  "weblink": "<string>",
  "emails": [
    {
      "email_address": "<string>",
      "is_primary": "<boolean>"
    }
  ],
  "phone_number": "<string | null>",
  "location": "<string | null>",
  "linked_in_handle": "<string | null>",
  "profiles": [
    {
      "network": "<string>",
      "url": "<string>",
      "username": "<string>"
    }
  ],
  "company": "<string | null>",
  "title": "<string | null>",
  "school": "<string | null>",
  "education_info": [
    {
      "school?": "<string | null>",
      "parsed_university": "<string | null>",
      "parsed_school": "<string | null>",
      "start_date": "<string | null>",
      "end_date": "<string | null>",
      "field_of_study": "<string | null>",
      "parsed_major_1": "<string | null>",
      "parsed_major_2": "<string | null>",
      "degree": "<string | null>"
    }
  ],
  "work_info": [
    {
      "company": "<string | null>",
      "title": "<string | null>",
      "work_start_date": "<string | null>",
      "work_end_date": "<string | null>",
      "is_current": "<boolean | null>"
    }
  ],
  "custom_fields": [
    {
      "id": "<string>",
      "name": "<string>",
      "scope": "<string>",
      "project_id?": "<string>",
      "value?": "<unknown>",
      "value_type": "<string>",
      "value_option_ids?": "<string[]>",
      "custom_field_category?": "<string>",
      "custom_field_value?": "<unknown>"
    }
  ],
  "due_date": "<{\"date\":\"<string>\",\"user_id\":\"<string>\",\"note\":\"<string | null>\"} | <null>>",
  "project_ids": "<<string[]> | <null>>",
  "sourced_from": "<string | null>",
  "gem_source": "<string | null>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gem/actions/create-candidate.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gem/actions/create-candidate.md)

<!-- END  GENERATED CONTENT -->

