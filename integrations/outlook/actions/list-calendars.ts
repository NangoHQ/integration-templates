import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (skipToken) from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Maximum number of calendars to return. Default is 10, maximum is 50.')
});

const CalendarSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    color: z.string().optional(),
    changeKey: z.string().optional(),
    canShare: z.boolean().optional(),
    canViewPrivateItems: z.boolean().optional(),
    canEdit: z.boolean().optional(),
    owner: z
        .object({
            name: z.string().optional(),
            address: z.string().optional()
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    value: z.array(CalendarSchema),
    '@odata.nextLink': z.string().optional()
});

const OutputSchema = z.object({
    calendars: z.array(CalendarSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List calendars in the mailbox.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-calendars',
        group: 'Calendars'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Calendars.Read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 10;

        // Build the config for nango.get
        // https://learn.microsoft.com/graph/api/user-list-calendars
        const config = {
            endpoint: '/v1.0/me/calendars',
            params: {
                $top: String(Math.min(limit, 50)),
                ...(input.cursor && { $skiptoken: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const providerData = ProviderResponseSchema.parse(response.data);

        // Extract skipToken from nextLink if present
        let nextCursor: string | undefined;
        if (providerData['@odata.nextLink']) {
            const nextLink = providerData['@odata.nextLink'];
            const skipTokenMatch = nextLink.match(/\$skiptoken=([^&]+)/);
            if (skipTokenMatch && skipTokenMatch[1]) {
                nextCursor = decodeURIComponent(skipTokenMatch[1]);
            }
        }

        return {
            calendars: providerData.value,
            ...(nextCursor && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
