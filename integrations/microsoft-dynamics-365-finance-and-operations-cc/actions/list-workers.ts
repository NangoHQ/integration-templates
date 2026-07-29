import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(10000).optional().describe('Maximum number of workers to return per page. Defaults to 100.'),
    fields: z.array(z.string()).optional().describe('Fields to include in the response using OData $select. Defaults to all fields.')
});

const ODataListSchema = z.object({
    value: z.array(z.unknown()),
    '@odata.nextLink': z.string().optional()
});

const WorkerSchema = z.object({}).passthrough();

const OutputSchema = z.object({
    items: z.array(WorkerSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List workers (employees).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 100;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;

        const params: Record<string, string> = {
            $top: String(limit),
            $skip: String(skip)
        };

        if (input.fields && input.fields.length > 0) {
            params['$select'] = input.fields.join(',');
        }

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const response = await nango.get({
            endpoint: '/data/Workers',
            params,
            retries: 3
        });

        const parsed = ODataListSchema.parse(response.data);
        const items = parsed.value.map((item) => WorkerSchema.parse(item));
        const nextCursor = parsed['@odata.nextLink'] !== undefined ? String(skip + items.length) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
