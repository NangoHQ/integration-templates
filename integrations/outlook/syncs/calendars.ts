import { createSync } from 'nango';
import { z } from 'zod';

const CalendarOwnerSchema = z.object({
    name: z.string().optional(),
    address: z.string().optional()
});

const MicrosoftCalendarSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    color: z.string().optional(),
    changeKey: z.string().optional(),
    canShare: z.boolean().optional(),
    canViewPrivateItems: z.boolean().optional(),
    canEdit: z.boolean().optional(),
    owner: CalendarOwnerSchema.optional()
});

const CalendarSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    color: z.string().optional(),
    changeKey: z.string().optional(),
    canShare: z.boolean().optional(),
    canViewPrivateItems: z.boolean().optional(),
    canEdit: z.boolean().optional(),
    owner: CalendarOwnerSchema.optional()
});

const sync = createSync({
    description: 'Sync mailbox calendars and basic calendar metadata',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Calendar: CalendarSchema
    },
    endpoints: [
        {
            path: '/syncs/calendars',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        // https://learn.microsoft.com/graph/api/user-list-calendars
        await nango.trackDeletesStart('Calendar');

        for await (const page of nango.paginate({
            // https://learn.microsoft.com/graph/api/user-list-calendars
            endpoint: '/v1.0/me/calendars',
            paginate: {
                type: 'link',
                response_path: 'value',
                link_path_in_response_body: '@odata.nextLink',
                limit: 50,
                limit_name_in_request: '$top'
            },
            retries: 3
        })) {
            const calendars = page.map((raw: unknown) => {
                const parseResult = MicrosoftCalendarSchema.safeParse(raw);
                if (!parseResult.success) {
                    throw new Error(`Invalid calendar record: ${parseResult.error.message}`);
                }
                const record = parseResult.data;

                return {
                    id: record.id,
                    ...(record.name != null && { name: record.name }),
                    ...(record.color != null && { color: record.color }),
                    ...(record.changeKey != null && { changeKey: record.changeKey }),
                    ...(record.canShare != null && { canShare: record.canShare }),
                    ...(record.canViewPrivateItems != null && { canViewPrivateItems: record.canViewPrivateItems }),
                    ...(record.canEdit != null && { canEdit: record.canEdit }),
                    ...(record.owner != null && {
                        owner: {
                            ...(record.owner.name != null && { name: record.owner.name }),
                            ...(record.owner.address != null && { address: record.owner.address })
                        }
                    })
                };
            });

            if (calendars.length > 0) {
                await nango.batchSave(calendars, 'Calendar');
            }
        }

        await nango.trackDeletesEnd('Calendar');
    }
});

export default sync;
