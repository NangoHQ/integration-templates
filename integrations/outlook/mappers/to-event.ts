import type { OutlookCalendarEvent } from '../../models.js';
import type { OutlookEvent } from '../types.js';

export function toEvent(eventData: OutlookEvent): OutlookCalendarEvent {
    return {
        id: eventData.id,
        subject: eventData.subject,
        bodyPreview: eventData.bodyPreview,
        importance: eventData.importance,
        sensitivity: eventData.sensitivity,
        isAllDay: eventData.isAllDay,
        isCancelled: eventData.isCancelled,
        isOrganizer: eventData.isOrganizer,
        responseRequested: eventData.responseRequested,
        webLink: eventData.webLink,
        onlineMeetingProvider: eventData.onlineMeetingProvider,
        responseStatus: {
            response: eventData.responseStatus.response,
            time: eventData.responseStatus.time
        },
        body: {
            content: eventData.body.content,
            contentType: eventData.body.contentType
        },
        start: {
            dateTime: eventData.start.dateTime,
            timeZone: eventData.start.timeZone
        },
        end: {
            dateTime: eventData.end.dateTime,
            timeZone: eventData.end.timeZone
        },
        location: {
            address: eventData.location.address,
            coordinates: eventData.location.coordinates,
            displayName: eventData.location.displayName,
            locationEmailAddress: eventData.location.locationEmailAddress,
            locationUri: eventData.location.locationUri,
            locationType: eventData.location.locationType,
            uniqueId: eventData.location.uniqueId,
            uniqueIdType: eventData.location.uniqueIdType
        },
        recurrence: eventData.recurrence
            ? {
                  pattern: {
                      ...(eventData.recurrence.pattern.dayOfMonth !== undefined && { dayOfMonth: eventData.recurrence.pattern.dayOfMonth }),
                      ...(eventData.recurrence.pattern.daysOfWeek !== undefined && { daysOfWeek: eventData.recurrence.pattern.daysOfWeek }),
                      ...(eventData.recurrence.pattern.firstDayOfWeek !== undefined && { firstDayOfWeek: eventData.recurrence.pattern.firstDayOfWeek }),
                      ...(eventData.recurrence.pattern.index !== undefined && { index: eventData.recurrence.pattern.index }),
                      interval: eventData.recurrence.pattern.interval,
                      ...(eventData.recurrence.pattern.month !== undefined && { month: eventData.recurrence.pattern.month }),
                      type: eventData.recurrence.pattern.type
                  },
                  range: {
                      startDate: eventData.recurrence.range.startDate,
                      ...(eventData.recurrence.range.endDate !== undefined && { endDate: eventData.recurrence.range.endDate }),
                      ...(eventData.recurrence.range.numberOfOccurrences !== undefined && {
                          numberOfOccurrences: eventData.recurrence.range.numberOfOccurrences
                      }),
                      ...(eventData.recurrence.range.recurrenceTimeZone !== undefined && { recurrenceTimeZone: eventData.recurrence.range.recurrenceTimeZone }),
                      type: eventData.recurrence.range.type
                  }
              }
            : null,
        attendees: eventData.attendees.map((attendee) => ({
            emailAddress: attendee.emailAddress,
            ...(attendee.proposedNewTime !== undefined && { proposedNewTime: attendee.proposedNewTime }),
            status: {
                response: attendee.status.response,
                sentDateTime: attendee.status.time
            },
            type: attendee.type
        })),
        organizer: {
            emailAddress: eventData.organizer.emailAddress
        },
        onlineMeeting: eventData.onlineMeeting
            ? {
                  conferenceId: eventData.onlineMeeting.conferenceId,
                  joinUrl: eventData.onlineMeeting.joinUrl,
                  phones: (eventData.onlineMeeting.phones || []).map((phone) => ({
                      number: phone.number,
                      type: phone.type
                  })),
                  quickDial: eventData.onlineMeeting.quickDial,
                  tollFreeNumbers: eventData.onlineMeeting.tollFreeNumbers || [],
                  tollNumber: eventData.onlineMeeting.tollNumber
              }
            : null
    };
}
