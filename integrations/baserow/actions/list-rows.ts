import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    tableId: z.number().int().positive().describe('Table ID. Example: 1080602'),
    page: z.number().optional().describe('Page number. Default: 1'),
    size: z.number().optional().describe('Page size. Default: 100, max: 200'),
    search: z.string().optional().describe('Search query string'),
    orderBy: z.string().optional().describe('Comma-separated field ids or display names. Example: field_9571320 or -field_9571320 for descending'),
    filter: z
        .record(z.string(), z.string().or(z.number()))
        .optional()
        .describe('Filter params. Keys like filter__field_<id>__<type>, values are filter values'),
    filterType: z.enum(['AND', 'OR']).optional().describe('Filter logic when multiple filter params are provided'),
    filters: z.string().optional().describe('JSON-serialized filter tree. If present, all filter__ params are ignored'),
    viewId: z.number().int().positive().optional().describe('View ID to inherit stored filters and sorts'),
    include: z.string().optional().describe('Comma-separated field names or field_<id> to include'),
    exclude: z.string().optional().describe('Comma-separated field names or field_<id> to exclude'),
    userFieldNames: z.boolean().optional().describe('When true, response keys and order_by/include/exclude use display names instead of field_<id>')
});

const RowSchema = z
    .object({
        id: z.number(),
        order: z.string()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    count: z.number(),
    next: z.string().nullable().optional(),
    previous: z.string().nullable().optional(),
    results: z.array(RowSchema)
});

const OutputSchema = z.object({
    count: z.number(),
    next: z.string().nullable().optional(),
    previous: z.string().nullable().optional(),
    results: z.array(RowSchema)
});

const action = createAction({
    description: 'List rows in a table with optional filtering, search, sorting, and pagination',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number | string[] | number[]> = {};

        if (input.page !== undefined) {
            params['page'] = input.page;
        }

        if (input.size !== undefined) {
            params['size'] = input.size;
        }

        if (input.search !== undefined) {
            params['search'] = input.search;
        }

        if (input.orderBy !== undefined) {
            params['order_by'] = input.orderBy;
        }

        if (input.filterType !== undefined) {
            params['filter_type'] = input.filterType;
        }

        if (input.filters !== undefined) {
            params['filters'] = input.filters;
        }

        if (input.viewId !== undefined) {
            params['view_id'] = input.viewId;
        }

        if (input.include !== undefined) {
            params['include'] = input.include;
        }

        if (input.exclude !== undefined) {
            params['exclude'] = input.exclude;
        }

        if (input.userFieldNames !== undefined) {
            params['user_field_names'] = input.userFieldNames ? 'true' : 'false';
        }

        if (input.filter !== undefined) {
            for (const [key, value] of Object.entries(input.filter)) {
                params[key] = value;
            }
        }

        const response = await nango.get({
            // https://api.baserow.io/api/redoc/
            endpoint: `/database/rows/table/${String(input.tableId)}/`,
            params,
            retries: 3
        });

        const data = ProviderResponseSchema.parse(response.data);

        return {
            count: data.count,
            ...(data.next !== undefined && data.next !== null && { next: data.next }),
            ...(data.previous !== undefined && data.previous !== null && { previous: data.previous }),
            results: data.results
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
