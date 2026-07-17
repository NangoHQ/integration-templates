import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const MetadataSchema = z.object({
    locationId: z.string().optional()
});

const InputSchema = z.object({
    calendarId: z.string().optional().describe('Calendar ID to filter appointments. Either calendarId, userId, or groupId is required.'),
    userId: z.string().optional().describe('User ID to filter appointments. Either calendarId, userId, or groupId is required.'),
    groupId: z.string().optional().describe('Group ID to filter appointments. Either calendarId, userId, or groupId is required.'),
    startTime: z.string().describe('Start time in milliseconds since epoch. Example: "1680373800000"'),
    endTime: z.string().describe('End time in milliseconds since epoch. Example: "1680978599999"')
});

const CreatedOrUpdatedBySchema = z.object({
    userId: z.string().optional(),
    source: z.string().optional()
});

const AppointmentSchema = z.object({
    id: z.string(),
    address: z.string().optional(),
    title: z.string(),
    calendarId: z.string(),
    locationId: z.string(),
    contactId: z.string(),
    groupId: z.string(),
    appointmentStatus: z.string(),
    assignedUserId: z.string(),
    users: z.array(z.string()),
    notes: z.string().optional(),
    description: z.string().optional(),
    isRecurring: z.boolean().optional(),
    rrule: z.string().optional(),
    startTime: z.string(),
    endTime: z.string(),
    dateAdded: z.string(),
    dateUpdated: z.string(),
    assignedResources: z.array(z.string()).optional(),
    createdBy: CreatedOrUpdatedBySchema.optional(),
    masterEventId: z.string().optional()
});

const OutputSchema = z.object({
    events: z.array(AppointmentSchema)
});

const action = createAction({
    description: 'List appointments from HighLevel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['calendars/events.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success || !parsedMetadata.data.locationId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'locationId is required in connection metadata.'
            });
        }

        if (!input.calendarId && !input.userId && !input.groupId) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Either calendarId, userId, or groupId is required.'
            });
        }

        const params: Record<string, string> = {
            locationId: parsedMetadata.data.locationId,
            startTime: input.startTime,
            endTime: input.endTime
        };

        if (input.calendarId) {
            params['calendarId'] = input.calendarId;
        }
        if (input.userId) {
            params['userId'] = input.userId;
        }
        if (input.groupId) {
            params['groupId'] = input.groupId;
        }

        const config: ProxyConfiguration = {
            // https://highlevel.stoplight.io/docs/integrations/calendar-events/get-calendar-events
            endpoint: '/calendars/events',
            params,
            headers: {
                Version: '2021-07-28'
            },
            retries: 3
        };

        const response = await nango.get(config);

        const parsedResponse = OutputSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response shape from HighLevel API.',
                details: parsedResponse.error.message
            });
        }

        return parsedResponse.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
