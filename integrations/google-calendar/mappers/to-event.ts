import type { GoogleCalendarEvent } from '../../models.js';
import type { GoogleCalendarEventsResponse } from '../types.js';

export function toEvent(event: GoogleCalendarEventsResponse): GoogleCalendarEvent {
    return {
        kind: event.kind,
        etag: event.etag,
        id: event.id,
        status: event.status,
        htmlLink: event.htmlLink,
        created: event.created,
        updated: event.updated,
        summary: event.summary,
        ...(event.iCalUID && { iCalUID: event.iCalUID }),
        ...(event.sequence && { sequence: event.sequence }),
        eventType: event.eventType,
        ...(event.description && { description: event.description }),
        ...(event.location && { location: event.location }),
        ...(event.colorId && { colorId: event.colorId }),
        ...(event.creator && { creator: event.creator }),
        ...(event.organizer && { organizer: event.organizer }),
        ...(event.start && { start: event.start }),
        ...(event.end && { end: event.end }),
        ...(event.endTimeUnspecified && { endTimeUnspecified: event.endTimeUnspecified }),
        ...(event.recurrence && { recurrence: event.recurrence }),
        ...(event.recurringEventId && { recurringEventId: event.recurringEventId }),
        ...(event.originalStartTime && { originalStartTime: event.originalStartTime }),
        ...(event.transparency && { transparency: event.transparency }),
        ...(event.visibility && { visibility: event.visibility }),
        ...(event.attendees && {
            attendees: event.attendees.map((attendee) => ({
                ...(attendee.id && { id: attendee.id }),
                ...(attendee.email && { email: attendee.email }),
                ...(attendee.displayName && { displayName: attendee.displayName }),
                ...(attendee.organizer && { organizer: attendee.organizer }),
                ...(attendee.self && { self: attendee.self }),
                ...(attendee.resource && { resource: attendee.resource }),
                ...(attendee.optional && { optional: attendee.optional }),
                ...(attendee.responseStatus && { responseStatus: attendee.responseStatus }),
                ...(attendee.comment && { comment: attendee.comment }),
                ...(attendee.additionalGuests && { additionalGuests: attendee.additionalGuests })
            }))
        }),
        ...(event.attendeesOmitted && { attendeesOmitted: event.attendeesOmitted }),
        ...(event.extendedProperties && { extendedProperties: event.extendedProperties }),
        ...(event.hangoutLink && { hangoutLink: event.hangoutLink }),
        ...(event.conferenceData && { conferenceData: event.conferenceData }),
        ...(event.gadget && { gadget: event.gadget }),
        ...(event.anyoneCanAddSelf && { anyoneCanAddSelf: event.anyoneCanAddSelf }),
        ...(event.guestsCanInviteOthers && { guestsCanInviteOthers: event.guestsCanInviteOthers }),
        ...(event.guestsCanModify && { guestsCanModify: event.guestsCanModify }),
        ...(event.guestsCanSeeOtherGuests && { guestsCanSeeOtherGuests: event.guestsCanSeeOtherGuests }),
        ...(event.privateCopy && { privateCopy: event.privateCopy }),
        ...(event.locked && { locked: event.locked }),
        ...(event.reminders && { reminders: event.reminders }),
        ...(event.source && { source: event.source }),
        ...(event.attachments && { attachments: event.attachments })
    };
}
