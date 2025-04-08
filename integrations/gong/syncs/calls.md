<!-- BEGIN GENERATED CONTENT -->
# Calls

## General Information

- **Description:** Fetches a list of calls from Gong

- **Version:** 1.0.0
- **Group:** Calls
- **Scopes:** `api:calls:read:basic, api:calls:read:media-url, api:calls:read:extensive`
- **Endpoint Type:** Sync
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/gong/syncs/calls.ts)


## Endpoint Reference

### Request Endpoint

`GET /calls`

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
  "url": "<string>",
  "title": "<string>",
  "scheduled": "<string>",
  "started": "<string>",
  "duration": "<number>",
  "direction": "<Inbound | Outbound | Conference | Unknown>",
  "scope": "<Internal | External | Unknown>",
  "media": "<string>",
  "language": "<string>",
  "workspace_id": "<string>",
  "purpose": "<string>",
  "meeting_url": "<string>",
  "is_private": "<boolean>",
  "calendar_event_id": "<string>",
  "context": {
    "system": "<Salesforce | HubSpot | MicrosoftDynamic | Generic>",
    "objects": {
      "object_type": "<string>",
      "object_id": "<string>",
      "fields": {
        "0": {
          "name": "<string>",
          "value": "<string>"
        }
      }
    }
  },
  "parties": {
    "0": {
      "id": "<string>",
      "email_address": "<string>",
      "name": "<string>",
      "title": "<string>",
      "user_id": "<string>",
      "speaker_id": "<string>",
      "affiliation": "<Internal | External | Unknown>",
      "methods": "<Invitee | Attendee>"
    }
  },
  "interaction": {
    "speakers": {
      "0": {
        "id": "<string>",
        "user_id": "<string>",
        "talkTime": "<number>"
      }
    },
    "interaction_stats": {
      "0": {
        "name": "<string>",
        "value": "<number>"
      }
    },
    "video": {
      "0": {
        "name": "<string>",
        "duration": "<number>"
      }
    },
    "questions": {
      "company_count": "<number>",
      "non_company_count": "<number>"
    }
  },
  "collaboration": {
    "public_comments": {
      "0": {
        "id": "<string>",
        "audio_start_time": "<number>",
        "audio_end_time": "<number>",
        "commenter_user_id": "<string>",
        "comment": "<string>",
        "posted": "<string>",
        "during_call": "<boolean>"
      }
    }
  },
  "media_urls": {
    "audio_url": "<string>",
    "video_url": "<string>"
  }
}
```

### Expected Metadata

```json
{
  "backfillPeriodMs": "<number>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gong/syncs/calls.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gong/syncs/calls.md)

<!-- END  GENERATED CONTENT -->

The sync expects the following metadata:
```json
{
  "backfillPeriodMs": 7776000000  // Custom example: 90 days in milliseconds
}
```
If no metadata is provided:
- The sync will default to fetching calls from the last 365 days.
- This only affects the first sync run
Subsequent syncs will always run incrementally from the last sync date, regardless of the initial backfill period
