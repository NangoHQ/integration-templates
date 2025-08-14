<!-- BEGIN GENERATED CONTENT -->
# Candidates

## General Information

- **Description:** Fetches a list of all candidates from your teamtailor account.
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** `Admin`
- **Endpoint Type:** Sync
- **Model:** `TeamtailorCandidate`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/teamtailor/syncs/candidates.ts)


## Endpoint Reference

### Request Endpoint

`GET /teamtailor/candidates`

### Request Query Parameters

- **modified_after:** `(optional, string)` A timestamp (e.g., `2023-05-31T11:46:13.390Z`) used to fetch records modified after this date and time. If not provided, all records are returned. The modified_after parameter is less precise than cursor, as multiple records may share the same modification timestamp.
- **limit:** `(optional, integer)` The maximum number of records to return per page. Defaults to 100.
- **cursor:** `(optional, string)` A marker used to fetch records modified after a specific point in time.If not provided, all records are returned.Each record includes a cursor value found in _nango_metadata.cursor.Save the cursor from the last record retrieved to track your sync progress.Use the cursor parameter together with the limit parameter to paginate through records.The cursor is more precise than modified_after, as it can differentiate between records with the same modification timestamp.
- **filter:** `(optional, added | updated | deleted)` Filter to only show results that have been added or updated or deleted.
- **ids:** `(optional, string[])` An array of string containing a list of your records IDs. The list will be filtered to include only the records with a matching ID.

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "type": "<string>",
  "links": {
    "self": "<string>"
  },
  "attributes": {
    "connected": "<boolean>",
    "consent_future_jobs_at": "<Date>",
    "created_at": "<Date>",
    "updated_at": "<Date>",
    "email": "<string>",
    "facebook_id": "<string>",
    "facebook_profile": "<string>",
    "first_name": "<string>",
    "internal": "<boolean>",
    "last_name": "<string>",
    "linkedin_profile": "<string>",
    "linkedin_uid": "<string>",
    "linkedin_url": "<string>",
    "original_resume": "<string>",
    "phone": "<string>",
    "picture": "<string>",
    "pitch": "<string>",
    "referring_site": "<string>",
    "referring_url": "<string>",
    "referred": "<boolean>",
    "resume": "<string>",
    "sourced": "<boolean>",
    "tags": "<unknown[]>",
    "unsubscribed": "<boolean>"
  },
  "relationships": {
    "activities": {
      "links": {
        "self": "<string>",
        "related": "<string>"
      }
    },
    "department": {
      "links": {
        "self": "<string>",
        "related": "<string>"
      }
    },
    "role": {
      "links": {
        "self": "<string>",
        "related": "<string>"
      }
    },
    "regions": {
      "links": {
        "self": "<string>",
        "related": "<string>"
      }
    },
    "job_applications": {
      "links": {
        "self": "<string>",
        "related": "<string>"
      }
    },
    "questions": {
      "links": {
        "self": "<string>",
        "related": "<string>"
      }
    },
    "answers": {
      "links": {
        "self": "<string>",
        "related": "<string>"
      }
    },
    "locations": {
      "links": {
        "self": "<string>",
        "related": "<string>"
      }
    },
    "uploads": {
      "links": {
        "self": "<string>",
        "related": "<string>"
      }
    },
    "custom_field_values": {
      "links": {
        "self": "<string>",
        "related": "<string>"
      }
    },
    "partner_results": {
      "links": {
        "self": "<string>",
        "related": "<string>"
      }
    }
  }
}
```

### Expected Metadata

```json
{}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/teamtailor/syncs/candidates.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/teamtailor/syncs/candidates.md)

<!-- END  GENERATED CONTENT -->

