# Create Meeting

## General Information

- **Description:** Creates a meeting in Zoom.
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: meeting:write
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/zoom/actions/create-meeting.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/meetings`
- **Method:** `POST`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "topic": "<string>",
  "type": "<instant | scheduled | recurringNoFixed | recurring | screenShareOnly>",
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
    "type?": "<daily | weekly | monthly>",
    "weekly_days?": "<sunday | monday | tuesday | wednesday | thursday | friday | saturday>"
  },
  "settings?": {
    "host_video?": "<boolean>",
    "participant_video?": "<boolean>",
    "join_before_host?": "<boolean>",
    "mute_upon_entry?": "<boolean>",
    "approval_type?": "<automatic | manually | notRequired>",
    "registration_type?": "<registerOnceAttendAny | registerEveryTime | registerOnceSelectOccurrences>",
    "audio?": "<both | telephony | voip | thirdParty>",
    "auto_recording?": "<local | cloud | none>",
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
