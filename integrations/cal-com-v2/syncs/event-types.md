<!-- BEGIN GENERATED CONTENT -->
# Event Types

## General Information

- **Description:** Retrieve all event types per a user
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `undefined`
- **Endpoint Type:** Sync
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/cal-com-v2/syncs/event-types.ts)


## Endpoint Reference

### Request Endpoint

`GET /event/types`

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
  "teamId": "<null | number>",
  "schedulingType": "<null | string>",
  "userId": "<number>",
  "metadata": {
    "__string": "<any>"
  },
  "description": "<string | null>",
  "hidden": "<boolean>",
  "slug": "<string>",
  "length": "<number>",
  "title": "<string>",
  "requiresConfirmation": "<boolean>",
  "position": "<number>",
  "offsetStart": "<number>",
  "profileId": "<string | null>",
  "eventName": "<string | null>",
  "parentId": "<number | null>",
  "timeZone": "<string | null>",
  "periodType": "<string>",
  "periodStartDate": "<string | null>",
  "periodEndDate": "<string | null>",
  "periodDays": "<number | null>",
  "periodCountCalendarDays": "<number | null>",
  "lockTimeZoneToggleOnBookingPage": "<boolean>",
  "requiresBookerEmailVerification": "<boolean>",
  "disableGuests": "<boolean>",
  "hideCalendarNotes": "<boolean>",
  "minimumBookingNotice": "<number>",
  "beforeEventBuffer": "<number>",
  "afterEventBuffer": "<number>",
  "seatsPerTimeSlot": "<number | null>",
  "onlyShowFirstAvailableSlot": "<boolean>",
  "seatsShowAttendees": "<boolean>",
  "seatsShowAvailabilityCount": "<boolean>",
  "scheduleId": "<number | null>",
  "price": "<number>",
  "currency": "<string>",
  "slotInterval": "<number | null>",
  "successRedirectUrl": "<string | null>",
  "isInstantEvent": "<boolean>",
  "aiPhoneCallConfig": "<string | null>",
  "assignAllTeamMembers": "<boolean>",
  "recurringEvent": "<boolean | null>",
  "locations": {
    "0": {
      "type": "<string>"
    }
  },
  "bookingFields": "<string | null>",
  "useEventTypeDestinationCalendarEmail": "<boolean>",
  "secondaryEmailId": "<string | null>",
  "bookingLimits": "<boolean | null>",
  "durationLimits": "<boolean | null>",
  "hashedLink": "<string | null>",
  "children": {
    "0": {
      "__string": "<any>"
    }
  },
  "hosts": {
    "0": {
      "__string": "<any>"
    }
  },
  "userIds": [
    "<number>"
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/cal-com-v2/syncs/event-types.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/cal-com-v2/syncs/event-types.md)

<!-- END  GENERATED CONTENT -->

