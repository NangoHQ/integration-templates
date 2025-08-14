<!-- BEGIN GENERATED CONTENT -->
# Create Meeting

## General Information

- **Description:** Creates a meeting in Zoom.
- **Version:** 1.0.0
- **Group:** Meetings
- **Scopes:** `meeting:write`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_zoom_createmeeting`
- **Input Model:** `ActionInput_zoom_createmeeting`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/zoom/actions/create-meeting.ts)


## Endpoint Reference

### Request Endpoint

`POST /meetings`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "topic": "<string>",
  "type": "<enum: 'instant' | 'scheduled' | 'recurringNoFixed' | 'recurring' | 'screenShareOnly'>",
  "agenda?": "<string>",
  "default_password?": "<boolean>",
  "duration?": "<number>",
  "password?": "<string>",
  "pre_schedule?": "<boolean>",
  "recurrence?": {
    "end_date_time?": "<string>",
    "end_times?": "<number>",
    "monthly_day?": "<number>",
    "monthly_week?": "<number>",
    "monthly_week_day?": "<number>",
    "repeat_interval?": "<number>",
    "type?": "<enum: 'daily' | 'weekly' | 'monthly'>",
    "weekly_days?": "<enum: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'>"
  },
  "settings?": {
    "host_video?": "<boolean>",
    "participant_video?": "<boolean>",
    "join_before_host?": "<boolean>",
    "mute_upon_entry?": "<boolean>",
    "approval_type?": "<enum: 'automatic' | 'manually' | 'notRequired'>",
    "registration_type?": "<enum: 'registerOnceAttendAny' | 'registerEveryTime' | 'registerOnceSelectOccurrences'>",
    "audio?": "<enum: 'both' | 'telephony' | 'voip' | 'thirdParty'>",
    "auto_recording?": "<enum: 'local' | 'cloud' | 'none'>",
    "waiting_room": "<boolean>"
  },
  "schedule_for?": "<string>",
  "start_time?": "<string>",
  "template_id?": "<string>",
  "timezone?": "<string>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "topic": "<string>",
  "startTime": "<string>",
  "duration": "<number>",
  "timezone": "<string>",
  "joinUrl": "<string>",
  "createdAt": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zoom/actions/create-meeting.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zoom/actions/create-meeting.md)

<!-- END  GENERATED CONTENT -->

