# Background Check Services

## General Information

- **Description:** Fetch the possible services that Checkr offers for a background check
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/checkr-partner/actions/background-check-services.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/background-check/service-list`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "services": [
    {
      "id": "<string>",
      "price": "<number>",
      "drug_screening_price": "<number | null>",
      "enabled_examples": [
        "<string>"
      ],
      "requires_observed_drug_test": "<boolean>",
      "object": "<string>",
      "apply_url": "<string>",
      "created_at": "<string>",
      "deleted_at": "<string | null>",
      "name": "<string>",
      "screenings": [
        {
          "type": "<string>",
          "subtype": "<string | null>"
        }
      ],
      "slug": "<string>",
      "uri": "<string>",
      "node?": "<string>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/checkr-partner/actions/background-check-services.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/checkr-partner/actions/background-check-services.md)

<!-- END  GENERATED CONTENT -->















