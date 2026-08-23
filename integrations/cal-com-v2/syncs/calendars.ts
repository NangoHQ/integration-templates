import { createSync } from 'nango';
import { z } from 'zod';

const CalendarSchema = z
    .object({
        id: z.string().describe('Unique stable identifier for the calendar, composed from integration, credential, and external IDs.'),
        externalId: z.string().describe('The external ID of the calendar from the provider (e.g., "primary" or a specific calendar ID).'),
        integration: z.string().optional().describe('The calendar integration type (e.g., "google_calendar", "office365_calendar").'),
        name: z.string().optional().describe('The display name of the calendar.'),
        primary: z.boolean().optional().describe('Whether this is the primary calendar for the integration.'),
        readOnly: z.boolean().describe('Whether the calendar is read-only.'),
        email: z.string().optional().describe('The email address associated with the calendar.'),
        isSelected: z.boolean().describe('Whether the calendar is selected for availability checking in Cal.com.'),
        credentialId: z.number().describe('The Cal.com credential ID linking this calendar to the account.'),
        delegationCredentialId: z.string().optional().describe('The delegation credential ID when using delegated access.')
    })
    .describe('A connected external calendar synced from Cal.com.');

const ProviderCalendarSchema = z.object({
    externalId: z.string(),
    integration: z.string().optional(),
    name: z.string().optional(),
    primary: z.boolean().nullable().optional(),
    readOnly: z.boolean(),
    email: z.string().optional(),
    isSelected: z.boolean(),
    credentialId: z.number(),
    delegationCredentialId: z.string().nullable().optional()
});

const ProviderConnectedCalendarSchema = z.object({
    credentialId: z.number(),
    delegationCredentialId: z.string().nullable().optional(),
    calendars: z.array(ProviderCalendarSchema).optional()
});

const ProviderResponseSchema = z.object({
    status: z.enum(['success', 'error']),
    data: z.object({
        connectedCalendars: z.array(ProviderConnectedCalendarSchema)
    })
});

const sync = createSync({
    description: 'Sync calendars from Cal.com.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Calendar: CalendarSchema
    },

    exec: async (nango) => {
        // GET /v2/calendars returns a full snapshot of connected calendars and
        // does not expose pagination or incremental filter parameters.
        await nango.trackDeletesStart('Calendar');

        // https://cal.com/docs/api-reference/v2/calendars/get-all-calendars
        const response = await nango.get({
            endpoint: '/calendars',
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.status !== 'success') {
            throw new Error('Cal.com API returned a non-success status for calendars.');
        }

        const calendars: z.infer<typeof CalendarSchema>[] = [];

        for (const connected of parsed.data.connectedCalendars) {
            for (const calendar of connected.calendars ?? []) {
                calendars.push({
                    id: `${calendar.integration ?? 'unknown'}:${calendar.credentialId}:${calendar.externalId}`,
                    externalId: calendar.externalId,
                    ...(calendar.integration !== undefined && { integration: calendar.integration }),
                    ...(calendar.name !== undefined && calendar.name !== null && { name: calendar.name }),
                    ...(calendar.primary !== undefined && calendar.primary !== null && { primary: calendar.primary }),
                    readOnly: calendar.readOnly,
                    ...(calendar.email !== undefined && calendar.email !== null && { email: calendar.email }),
                    isSelected: calendar.isSelected,
                    credentialId: calendar.credentialId,
                    ...(calendar.delegationCredentialId !== undefined &&
                        calendar.delegationCredentialId !== null && { delegationCredentialId: calendar.delegationCredentialId })
                });
            }
        }

        if (calendars.length > 0) {
            await nango.batchSave(calendars, 'Calendar');
        }

        await nango.trackDeletesEnd('Calendar');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
