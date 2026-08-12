import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        calendarId: z.string().describe('Calendar identifier. Use "primary" for the primary calendar of the logged-in user.')
    })
    .describe('Input for getting a calendar by ID.');

const ProviderConferencePropertiesSchema = z.object({
    allowedConferenceSolutionTypes: z.array(z.string()).optional()
});

const ProviderEventLabelSchema = z.object({
    id: z.string().optional(),
    backgroundColor: z.string().optional(),
    name: z.string().optional()
});

const ProviderLabelPropertiesSchema = z.object({
    eventLabels: z.array(ProviderEventLabelSchema).optional()
});

const ProviderCalendarSchema = z.object({
    kind: z.string().optional(),
    etag: z.string().optional(),
    id: z.string(),
    summary: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    timeZone: z.string().optional(),
    dataOwner: z.string().optional(),
    conferenceProperties: ProviderConferencePropertiesSchema.optional(),
    labelProperties: ProviderLabelPropertiesSchema.optional(),
    autoAcceptInvitations: z.boolean().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Identifier of the calendar.'),
        etag: z.string().optional().describe('ETag of the resource.'),
        kind: z.string().optional().describe('Type of the resource ("calendar#calendar").'),
        summary: z.string().optional().describe('Title of the calendar.'),
        description: z.string().optional().describe('Description of the calendar.'),
        location: z.string().optional().describe('Geographic location of the calendar as free-form text.'),
        timeZone: z.string().optional().describe('Time zone of the calendar as an IANA Time Zone Database name, e.g. "Europe/Zurich".'),
        dataOwner: z.string().optional().describe('Email of the owner of the calendar. Set only for secondary calendars.'),
        conferenceProperties: z
            .object({
                allowedConferenceSolutionTypes: z.array(z.string()).optional().describe('Types of conference solutions supported for this calendar.')
            })
            .optional()
            .describe('Conferencing properties for this calendar.'),
        labelProperties: z
            .object({
                eventLabels: z
                    .array(
                        z.object({
                            id: z.string().optional().describe('The ID of the label.'),
                            backgroundColor: z.string().optional().describe('Background color of the label in hexadecimal format.'),
                            name: z.string().optional().describe('Name of the label.')
                        })
                    )
                    .optional()
                    .describe('Event labels defined on this calendar.')
            })
            .optional()
            .describe('Label properties defined on this calendar.'),
        autoAcceptInvitations: z.boolean().optional().describe('Whether this calendar automatically accepts invitations. Only valid for resource calendars.')
    })
    .describe('Calendar metadata returned by the Google Calendar API.');

/**
 * @tags: [read]
 * @tagReason: Reads calendar metadata from the Google Calendar API.
 * @pitfalls: The keyword "primary" resolves to the user's email address in the response id, so input and output IDs will not match when using that alias.
 */
const action = createAction({
    description: 'Get a calendar by ID',
    version: '2.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/calendar/api/v3/reference/calendars/get
        const response = await nango.get({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Calendar not found',
                calendarId: input.calendarId
            });
        }

        const providerCalendar = ProviderCalendarSchema.parse(response.data);

        return {
            id: providerCalendar.id,
            ...(providerCalendar.etag !== undefined && { etag: providerCalendar.etag }),
            ...(providerCalendar.kind !== undefined && { kind: providerCalendar.kind }),
            ...(providerCalendar.summary !== undefined && { summary: providerCalendar.summary }),
            ...(providerCalendar.description !== undefined && { description: providerCalendar.description }),
            ...(providerCalendar.location !== undefined && { location: providerCalendar.location }),
            ...(providerCalendar.timeZone !== undefined && { timeZone: providerCalendar.timeZone }),
            ...(providerCalendar.dataOwner !== undefined && { dataOwner: providerCalendar.dataOwner }),
            ...(providerCalendar.conferenceProperties !== undefined && {
                conferenceProperties: {
                    ...(providerCalendar.conferenceProperties.allowedConferenceSolutionTypes !== undefined && {
                        allowedConferenceSolutionTypes: providerCalendar.conferenceProperties.allowedConferenceSolutionTypes
                    })
                }
            }),
            ...(providerCalendar.labelProperties !== undefined && {
                labelProperties: {
                    ...(providerCalendar.labelProperties.eventLabels !== undefined && {
                        eventLabels: providerCalendar.labelProperties.eventLabels
                    })
                }
            }),
            ...(providerCalendar.autoAcceptInvitations !== undefined && { autoAcceptInvitations: providerCalendar.autoAcceptInvitations })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
