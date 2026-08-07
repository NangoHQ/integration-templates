import { z } from 'zod';
import { createAction } from 'nango';

const MonitorSchema = z
    .object({
        id: z.number().describe('Monitor ID. Example: 310560464'),
        name: z.string().describe('Monitor name.'),
        type: z.string().describe('Monitor type. Example: "metric alert"'),
        query: z.string().optional().describe('The monitor query.'),
        message: z.string().optional().describe('The monitor message (markdown).'),
        tags: z.array(z.string()).optional().describe('Tags associated with the monitor.'),
        overall_state: z.string().optional().describe('Overall state of the monitor. Example: "Alert"'),
        created: z.union([z.string(), z.number()]).optional().describe('Creation timestamp.'),
        modified: z.union([z.string(), z.number()]).optional().describe('Last modified timestamp.')
    })
    .passthrough();

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    page_size: z.number().int().min(1).max(1000).optional().describe('Number of monitors to return per page. Defaults to 100.')
});

const OutputSchema = z.object({
    items: z.array(MonitorSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List monitors (alerting rules) configured in this Datadog account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['monitors_read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const pageSize = input.page_size ?? 100;
        if (input.cursor !== undefined && !/^\d+$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a valid page number.'
            });
        }
        const page = input.cursor ? Number(input.cursor) : 0;

        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/monitors/#get-all-monitors
            endpoint: 'v1/monitor',
            params: {
                page: String(page),
                page_size: String(pageSize)
            },
            retries: 3
        });

        const rawData = z.array(z.unknown()).parse(response.data);
        const items = rawData.map((item) => MonitorSchema.parse(item));

        const nextCursor = items.length === pageSize ? String(page + 1) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
