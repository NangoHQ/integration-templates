import { z } from 'zod';
import { createAction } from 'nango';

const FilterSchema = z.object({
    column: z.string().describe('Column name to filter on. Example: "name"'),
    operator: z.string().describe('PostgREST operator. Example: "eq", "gte", "like"'),
    value: z.union([z.string(), z.number(), z.boolean()]).describe('Filter value. Example: "alpha"')
});

const InputSchema = z.object({
    table: z.string().describe('Table name to query. Example: "nango_test"'),
    select: z.string().optional().describe('Columns to select. Example: "id,name,value"'),
    filters: z.array(FilterSchema).optional().describe('PostgREST filters'),
    order: z.string().optional().describe('Order by clause. Example: "name.desc"'),
    limit: z.number().int().optional().describe('Maximum rows to return. Example: 100'),
    offset: z.number().int().optional().describe('Number of rows to skip. Example: 0'),
    count: z.boolean().optional().describe('Return total row count')
});

const OutputSchema = z.object({
    rows: z.array(z.record(z.string(), z.unknown())).describe('Matching table rows'),
    count: z.number().int().optional().describe('Total row count when count was requested'),
    limit: z.number().int().optional(),
    offset: z.number().int().optional()
});

const ConnectionConfigSchema = z.object({
    projectUrl: z.string().optional()
});

const action = createAction({
    description: 'Query rows from a Supabase table through PostgREST.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/query-table-rows',
        group: 'PostgREST'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const rawConfig = connection.connection_config ?? {};
        const connectionConfig = ConnectionConfigSchema.parse(rawConfig);
        const projectUrl = connectionConfig.projectUrl;
        const baseUrlOverride = projectUrl?.startsWith('http') ? projectUrl : undefined;

        const params: Record<string, string> = {};
        if (input['select'] !== undefined) {
            params['select'] = input['select'];
        }
        if (input['order'] !== undefined) {
            params['order'] = input['order'];
        }
        for (const filter of input['filters'] || []) {
            params[filter.column] = `${filter.operator}.${filter.value}`;
        }

        const headers: Record<string, string> = {};
        if (input['count'] === true) {
            headers['Prefer'] = 'count=exact';
        }
        if (input['limit'] !== undefined) {
            const start = input['offset'] ?? 0;
            const end = start + input['limit'] - 1;
            headers['Range'] = `${start}-${end}`;
        }

        // https://supabase.com/docs/reference/api
        const response = await nango.get({
            endpoint: `/rest/v1/${encodeURIComponent(input.table)}`,
            params,
            headers,
            retries: 3,
            baseUrlOverride
        });

        const rows = z.array(z.record(z.string(), z.unknown())).parse(response.data);

        let count: number | undefined;
        if (input['count'] === true) {
            const contentRange = response.headers['content-range'];
            if (typeof contentRange === 'string') {
                const slashIndex = contentRange.lastIndexOf('/');
                if (slashIndex !== -1) {
                    const totalStr = contentRange.slice(slashIndex + 1);
                    const parsed = parseInt(totalStr, 10);
                    if (!isNaN(parsed)) {
                        count = parsed;
                    }
                }
            }
        }

        return {
            rows,
            ...(count !== undefined && { count }),
            ...(input['limit'] !== undefined && { limit: input['limit'] }),
            ...(input['offset'] !== undefined && { offset: input['offset'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
