import type { NangoAction, ActionResponseError, ProxyConfiguration, CreateMeeting, Meeting } from '../../models';
import { createMeetingSchema } from '../schema.zod.js';
import type { ZoomCreatedMeeting } from '../types';

export default async function runAction(nango: NangoAction, input: CreateMeeting): Promise<Meeting> {
    nango.zodValidate({ zodSchema: createMeetingSchema, input });

    const zoomInput: Record<string, any> = {
        ...input,
        type: determineMeetingType(input.type)
    };

    if (zoomInput['recurrence']?.['type']) {
        zoomInput['recurrence']['type'] = determineRecurrenceType(zoomInput['recurrence']['type']);
    }

    if (zoomInput['recurrence']?.['weekly_days']) {
        zoomInput['recurrence']['weekly_days'] = determineWeeklyDays(zoomInput['recurrence']['weekly_days']);
    }

    if (zoomInput['settings']?.['approval_type']) {
        zoomInput['settings']['approval_type'] = determineApprovalType(zoomInput['settings']['approval_type']);
    }

    if (zoomInput['settings']?.['registration_type']) {
        zoomInput['settings']['registration_type'] = determineRegistrationType(zoomInput['settings']['registration_type']);
    }

    const config: ProxyConfiguration = {
        // https://developers.zoom.us/docs/api/meetings/#tag/meetings/POST/users/{userId}/meetings
        endpoint: `/users/me/meetings`,
        data: zoomInput,
        retries: 10
    };

    const response = await nango.post<ZoomCreatedMeeting>(config);

    const { data } = response;

    const meeting: Meeting = {
        id: data.id.toString(),
        topic: data.topic,
        startTime: data.start_time,
        duration: data.duration,
        timezone: data.timezone,
        joinUrl: data.join_url,
        createdAt: data.created_at
    };

    return meeting;
}

function determineMeetingType(type: CreateMeeting['type']): number {
    switch (type) {
        case 'instant':
            return 1;
        case 'scheduled':
            return 2;
        case 'recurringNoFixed':
            return 3;
        case 'recurring':
            return 8;
        case 'screenShareOnly':
            return 10;
        default:
            return 2;
    }
}

function determineRecurrenceType(type: string): number {
    switch (type) {
        case 'daily':
            return 1;
        case 'weekly':
            return 2;
        case 'monthly':
            return 3;
        default:
            return 2;
    }
}

function determineWeeklyDays(type: string): number {
    switch (type) {
        case 'sunday':
            return 1;
        case 'monday':
            return 2;
        case 'tuesday':
            return 3;
        case 'wednesday':
            return 4;
        case 'thursday':
            return 5;
        case 'friday':
            return 6;
        case 'saturday':
            return 7;
        default:
            return 1;
    }
}

function determineApprovalType(type: string): number {
    switch (type) {
        case 'automaticallyApprove':
            return 0;
        case 'manuallyApprove':
            return 1;
        case 'noRegistrationRequired':
            return 2;
        default:
            return 0;
    }
}

function determineRegistrationType(type: string): number {
    switch (type) {
        case 'registerOnceAttendAny':
            return 1;
        case 'registerEachTime':
            return 2;
        case 'registerOnceSelectOccurrences':
            return 3;
        default:
            return 1;
    }
}
