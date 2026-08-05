import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.')
});

const CalendarEntryStatusSchema = z.object({
    id: z.number(),
    name: z.string(),
    status_type: z.string().optional(),
    position: z.number().optional(),
    hex_color: z.string().optional(),
    in_use: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ProviderListSchema = z.object({
    entries: z.array(CalendarEntryStatusSchema),
    pagination: z.object({
        page: z.number(),
        per_page: z.number(),
        pages: z.number(),
        total: z.number()
    })
});

const OutputSchema = z.object({
    entries: z.array(
        z.object({
            id: z.number(),
            name: z.string(),
            status_type: z.string().optional(),
            position: z.number().optional(),
            hex_color: z.string().optional(),
            in_use: z.boolean().optional()
        })
    ),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List statuses that can be assigned to a calendar entry.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer page number'
            });
        }

        const response = await nango.get({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: '/api/v3/admin/calendar_entry_statuses',
            params: {
                page: page.toString()
            },
            retries: 3
        });

        const providerList = ProviderListSchema.parse(response.data);
        const hasMore = providerList.pagination.page < providerList.pagination.pages;

        return {
            entries: providerList.entries.map((status) => ({
                id: status.id,
                name: status.name,
                ...(status.status_type !== undefined && { status_type: status.status_type }),
                ...(status.position !== undefined && { position: status.position }),
                ...(status.hex_color !== undefined && { hex_color: status.hex_color }),
                ...(status.in_use !== undefined && { in_use: status.in_use })
            })),
            ...(hasMore && { next_cursor: (page + 1).toString() })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
