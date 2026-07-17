import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    locationId: z
        .string()
        .optional()
        .describe('Location ID to list calendars for. If omitted, resolved from connection configuration. Example: "AYg6rIXHN1fXdXjGcYvI"'),
    groupId: z.string().optional().describe('Calendar group ID to filter by. Example: "BqTwX8QFwXzpegMve9EQ"'),
    showDrafted: z.boolean().optional().describe('Include drafted calendars. Defaults to true if omitted.'),
    cursor: z.string().optional().describe('Pagination cursor. Not used by this API endpoint, present for list action convention.')
});

const CalendarSchema = z
    .object({
        id: z.string(),
        name: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        slug: z.string().nullable().optional(),
        widgetSlug: z.string().nullable().optional(),
        calendarType: z.string().nullable().optional(),
        eventType: z.string().nullable().optional(),
        locationId: z.string().nullable().optional(),
        groupId: z.string().nullable().optional(),
        isActive: z.boolean().nullable().optional(),
        slotDuration: z.number().nullable().optional(),
        slotDurationUnit: z.string().nullable().optional(),
        slotInterval: z.number().nullable().optional(),
        widgetType: z.string().nullable().optional(),
        eventTitle: z.string().nullable().optional(),
        eventColor: z.string().nullable().optional(),
        teamMembers: z.array(z.unknown()).nullable().optional(),
        locationConfigurations: z.array(z.unknown()).nullable().optional(),
        openHours: z
            .union([z.record(z.string(), z.unknown()), z.array(z.unknown())])
            .nullable()
            .optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(CalendarSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List calendars from HighLevel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['calendars.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let locationId = input.locationId;

        if (!locationId) {
            const connectionRaw = await nango.getConnection();

            const ConnectionSchema = z.object({
                connection_config: z.object({
                    locationId: z.string()
                })
            });

            const connection = ConnectionSchema.safeParse(connectionRaw);
            if (!connection.success) {
                throw new nango.ActionError({
                    type: 'invalid_connection',
                    message: 'Missing locationId in input or connection configuration.'
                });
            }

            locationId = connection.data.connection_config.locationId;
        }

        const response = await nango.get({
            // https://marketplace.gohighlevel.com/docs/ghl/calendars/get-calendars
            endpoint: '/calendars/',
            headers: {
                Version: '2021-07-28'
            },
            params: {
                locationId,
                ...(input.groupId !== undefined && { groupId: input.groupId }),
                ...(input.showDrafted !== undefined && { showDrafted: String(input.showDrafted) })
            },
            retries: 3
        });

        const RawResponseSchema = z.object({
            calendars: z.array(z.unknown())
        });

        const rawResponse = RawResponseSchema.safeParse(response.data);
        if (!rawResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response shape from provider.'
            });
        }

        const items = rawResponse.data.calendars.map((item) => {
            const parsed = CalendarSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Calendar item failed validation.'
                });
            }
            return parsed.data;
        });

        return {
            items
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
