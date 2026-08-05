import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

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
    pagination: z
        .object({
            page: z.number().optional(),
            per_page: z.number().optional(),
            pages: z.number().optional(),
            total: z.number().optional()
        })
        .optional()
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
    )
});

const action = createAction({
    description: 'List statuses that can be assigned to a calendar entry.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: '/api/v3/admin/calendar_entry_statuses',
            retries: 3
        });

        const providerList = ProviderListSchema.parse(response.data);

        return {
            entries: providerList.entries.map((status) => ({
                id: status.id,
                name: status.name,
                ...(status.status_type !== undefined && { status_type: status.status_type }),
                ...(status.position !== undefined && { position: status.position }),
                ...(status.hex_color !== undefined && { hex_color: status.hex_color }),
                ...(status.in_use !== undefined && { in_use: status.in_use })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
