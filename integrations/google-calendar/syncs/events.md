<!-- BEGIN GENERATED CONTENT -->
# Events

## General Information

- **Description:** Sync calendar events on the primary calendar going back one month and
save the entire object as specified by the Google API

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `https://www.googleapis.com/auth/calendar.readonly`
- **Endpoint Type:** Sync
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/google-calendar/syncs/events.ts)


## Endpoint Reference

### Request Endpoint

`GET /google-calendar/events`

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
  "kind": "<string>",
  "etag": "<string>",
  "id": "<string>",
  "status": "<string>",
  "htmlLink": "<string>",
  "created": "<string>",
  "updated": "<string>",
  "summary": "<string>",
  "description": "<string>",
  "location": "<string>",
  "colorId": "<string>",
  "creator": {
    "id": "<string>",
    "email": "<string>",
    "displayName": "<string>",
    "self": "<boolean>"
  },
  "organizer": {
    "id": "<string>",
    "email": "<string>",
    "displayName": "<string>",
    "self": "<boolean>"
  },
  "start": {
    "date": "<date>",
    "dateTime": "<string>",
    "timeZone": "<string>"
  },
  "end": {
    "date": "<date>",
    "string": "<string>",
    "timeZone": "<string>"
  },
  "endTimeUnspecified": "<boolean>",
  "recurrence": {
    "0": "<string>"
  },
  "recurringEventId": "<string>",
  "originalStartTime": {
    "date": "<date>",
    "dateTime": "<string>",
    "timeZone": "<string>"
  },
  "transparency": "<string>",
  "visibility": "<string>",
  "iCalUID": "<string>",
  "sequence": "<integer>",
  "attendees": {
    "0": {
      "id": "<string>",
      "email": "<string>",
      "displayName": "<string>",
      "organizer": "<boolean>",
      "self": "<boolean>",
      "resource": "<boolean>",
      "optional": "<boolean>",
      "responseStatus": "<string>",
      "comment": "<string>",
      "additionalGuests": "<integer>"
    }
  },
  "attendeesOmitted": "<boolean>",
  "extendedProperties": {
    "private": {
      "key": "<string>"
    },
    "shared": {
      "key": "<string>"
    }
  },
  "hangoutLink": "<string>",
  "conferenceData": {
    "createRequest": {
      "requestId": "<string>",
      "conferenceSolutionKey": {
        "type": "<string>"
      },
      "status": {
        "statusCode": "<string>"
      }
    },
    "entryPoints": {
      "0": {
        "entryPointType": "<string>",
        "uri": "<string>",
        "label": "<string>",
        "pin": "<string>",
        "accessCode": "<string>",
        "meetingCode": "<string>",
        "passcode": "<string>",
        "password": "<string>"
      }
    },
    "conferenceSolution": {
      "key": {
        "type": "<string>"
      },
      "name": "<string>",
      "iconUri": "<string>"
    },
    "conferenceId": "<string>",
    "signature": "<string>",
    "notes": "<string>"
  },
  "gadget": {
    "type": "<string>",
    "title": "<string>",
    "link": "<string>",
    "iconLink": "<string>",
    "width": "<integer>",
    "height": "<integer>",
    "display": "<string>",
    "preferences": {
      "key": "<string>"
    }
  },
  "anyoneCanAddSelf": "<boolean>",
  "guestsCanInviteOthers": "<boolean>",
  "guestsCanModify": "<boolean>",
  "guestsCanSeeOtherGuests": "<boolean>",
  "privateCopy": "<boolean>",
  "locked": "<boolean>",
  "reminders": {
    "useDefault": "<boolean>",
    "overrides": {
      "0": {
        "method": "<string>",
        "minutes": "<integer>"
      }
    }
  },
  "source": {
    "url": "<string>",
    "title": "<string>"
  },
  "workingLocationProperties": {
    "type": "<string>",
    "homeOffice": "<string>",
    "customLocation": {
      "label": "<string>"
    },
    "officeLocation": {
      "buildingId": "<string>",
      "floorId": "<string>",
      "floorSectionId": "<string>",
      "deskId": "<string>",
      "label": "<string>"
    }
  },
  "attachments": {
    "0": {
      "fileUrl": "<string>",
      "title": "<string>",
      "mimeType": "<string>",
      "iconLink": "<string>",
      "fileId": "<string>"
    }
  },
  "eventType": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-calendar/syncs/events.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-calendar/syncs/events.md)

<!-- END  GENERATED CONTENT -->

