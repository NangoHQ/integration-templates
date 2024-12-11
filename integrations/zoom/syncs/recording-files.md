# Recording Files

## General Information

- **Description:** Fetches a list of recordings from Zoom

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `cloud_recording:read:list_user_recordings, cloud_recording:read:list_recording_files`
- **Endpoint Type:** Sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/zoom/syncs/recording-files.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/recording-files`
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
  "deletedTime?": "<string>",
  "downloadUrl": "<string>",
  "filePath?": "<string>",
  "fileSize": "<number>",
  "fileType": "<MP4 | M4A | CHAT | TRANSCRIPT | CSV | TB | CC | CHAT_MESSAGE | SUMMARY | TIMELINE>",
  "fileExtension": "<MP4 | M4A | TXT | VTT | CSV | JSON | JPG>",
  "meetingId": "<string>",
  "playUrl?": "<string>",
  "recordingEnd": "<string>",
  "recordingStart": "<string>",
  "recordingType": "<shared_screen_with_speaker_view(CC) | shared_screen_with_speaker_view | shared_screen_with_gallery_view | active_speaker | gallery_view | shared_screen | audio_only | audio_transcript | chat_file | poll | host_video | closed_caption | timeline | thumbnail | audio_interpretation | summary | summary_next_steps | summary_smart_chapters | sign_interpretation | production_studio>",
  "status": "<completed>",
  "autoDelete?": "<boolean>",
  "autoDeleteDate?": "<string>",
  "playPasscode": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zoom/syncs/recording-files.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zoom/syncs/recording-files.md)

<!-- END  GENERATED CONTENT -->

