<!-- BEGIN GENERATED CONTENT -->
# Create Candidate

## General Information

- **Description:** Create a candidate
- **Version:** 2.0.0
- **Group:** Others
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_checkr_partner_createcandidate`
- **Input Model:** `ActionInput_checkr_partner_createcandidate`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/checkr-partner/actions/create-candidate.ts)


## Endpoint Reference

### Request Endpoint

`POST /candidates`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "city?": "<string>",
  "country": "<string>",
  "state?": "<string>",
  "first_name": "<string>",
  "middle_name?": "<string>",
  "no_middle_name?": "<boolean>",
  "last_name": "<string>",
  "email": "<string>",
  "phone": "<string>",
  "zipcode": "<string>",
  "dob": "<string>",
  "ssn": "<string>",
  "driver_license_number": "<string>",
  "driver_license_state": "<string>",
  "work_locations": [
    {
      "city?": "<string>",
      "country": "<string>",
      "state?": "<string>"
    }
  ]
}
```

### Request Response

```json
{
  "id": "<string>",
  "object": "<string>",
  "uri": "<string>",
  "first_name": "<string>",
  "middle_name": "<string | null>",
  "last_name": "<string>",
  "mother_maiden_name": "<string>",
  "email": "<string>",
  "phone": "<number>",
  "zipcode": "<number>",
  "dob": "<string>",
  "ssn": "<string>",
  "driver_license_number": "<string>",
  "driver_license_state": "<string>",
  "previous_driver_license_number": "<string>",
  "previous_driver_license_state": "<string>",
  "copy_requested": "<boolean>",
  "custom_id": "<string>",
  "report_ids": "<string[]>",
  "geo_ids": "<string[]>",
  "adjudication": "<string>",
  "metadata": {}
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/checkr-partner/actions/create-candidate.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/checkr-partner/actions/create-candidate.md)

<!-- END  GENERATED CONTENT -->

