# Calls

## General Information

- **Description:** Fetches a list of calls from your account. For the first sync, it will go back to the past one year

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** Sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/clari-copilot/syncs/calls.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/calls`
- **Method:** `GET`

### Request Query Parameters

- **modified_after:** `(optional, string)` A timestamp (e.g., `2023-05-31T11:46:13.390Z`) used to fetch records modified after this date and time. If not provided, all records are returned. The modified_after parameter is less precise than cursor, as multiple records may share the same modification timestamp.
- **limit:** `(optional, integer)` The maximum number of records to return per page. Defaults to 100.
- **cursor:** `(optional, string)` A marker used to fetch records modified after a specific point in time.If not provided, all records are returned.Each record includes a cursor value found in _nango_metadata.cursor.Save the cursor from the last record retrieved to track your sync progress.Use the cursor parameter together with the limit parameter to paginate through records.The cursor is more precise than modified_after, as it can differentiate between records with the same modification timestamp.
- **filter:** `(optional, added | updated | deleted)` Filter to only show results that have been added or updated or deleted.

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "source_id": "<string>",
  "title": "<string>",
  "users": [
    "<any>"
  ],
  "externalParticipants": [
    "<any>"
  ],
  "status": "<string>",
  "bot_not_join_reason": [
    "<string>"
  ],
  "type": "<string>",
  "time": "<string>",
  "icaluid": "<string>",
  "calendar_id": "<string>",
  "recurring_event_id": "<string>",
  "original_start_time": "<string>",
  "last_modified_time": "<string>",
  "audio_url": "<string>",
  "video_url": "<string>",
  "disposition": "<string>",
  "deal_name": "<string>",
  "deal_value": "<string>",
  "deal_close_date": "<string>",
  "deal_stage_before_call": "<string>",
  "account_name": "<string>",
  "contact_names": [
    "<string>"
  ],
  "crm_info": {
    "source_crm": "<string>",
    "deal_id": "<string>",
    "account_id": "<string>",
    "contact_ids": [
      "<string>"
    ]
  },
  "bookmark_timestamps": [
    "<string>"
  ],
  "metrics": {
    "talk_listen_ratio": "<number>",
    "num_questions_asked": "<number>",
    "num_questions_asked_by_reps": "<number>",
    "call_duration": "<number>",
    "total_speak_duration": "<number>",
    "longest_monologue_duration": "<number>",
    "longest_monologue_start_time": "<number>",
    "engaging_questions": "<number>",
    "categories": [
      "<string>"
    ]
  },
  "call_review_page_url": "<string>",
  "deal_stage_live": "<string>",
  "transcript": [
    "<string>"
  ],
  "summary": {
    "full_summary": "<string>",
    "topics_discussed": [
      "<string>"
    ],
    "key_action_items": [
      "<string>"
    ]
  },
  "competitor_sentiments": [
    "<string>"
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/clari-copilot/syncs/calls.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/clari-copilot/syncs/calls.md)

<!-- END  GENERATED CONTENT -->

