# Recording Files

## General Information
- **Description:** Fetches a list of recordings from Zoom

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: cloud_recording:read:list_user_recordings,cloud_recording:read:list_recording_files
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/zoom/syncs/recording-files.ts)

### Request Endpoint

- **Path:** `/recording-files`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

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

undefined