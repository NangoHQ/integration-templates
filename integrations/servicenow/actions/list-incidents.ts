import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    query: z.string().optional().describe('Encoded query string for filtering records. Example: active=true'),
    limit: z.number().int().min(1).max(1000).optional().describe('Maximum number of records to return. Maps to sysparm_limit.'),
    offset: z.number().int().min(0).optional().describe('Number of records to skip. Maps to sysparm_offset.'),
    fields: z.array(z.string()).optional().describe('Fields to return. Maps to sysparm_fields.'),
    display_value: z
        .union([z.boolean(), z.enum(['all', 'true', 'false'])])
        .optional()
        .describe('Return display values instead of database values.')
});

const ProviderResponseSchema = z.object({
    result: z.array(z.record(z.string(), z.unknown()))
});

const OutputSchema = z.object({
    incidents: z.array(z.record(z.string(), z.unknown())),
    next_offset: z.number().optional().describe('Offset for the next page, if more results exist.')
});

const action = createAction({
    description: 'List incidents.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 100;
        const offset = input.offset ?? 0;

        const params: Record<string, string | number> = {
            sysparm_limit: limit,
            sysparm_offset: offset
        };

        if (input.query !== undefined) {
            params['sysparm_query'] = input.query;
        }

        if (input.fields !== undefined && input.fields.length > 0) {
            params['sysparm_fields'] = input.fields.join(',');
        }

        if (input.display_value !== undefined) {
            params['sysparm_display_value'] = String(input.display_value);
        }

        // https://developer.servicenow.com/dev.do#!/reference/api
        const response = await nango.get({
            endpoint: '/api/now/table/incident',
            params,
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);
        const incidents = providerData.result;

        const linkHeader = typeof response.headers === 'object' && response.headers !== null ? response.headers['link'] || response.headers['Link'] : undefined;

        const hasNext = typeof linkHeader === 'string' && linkHeader.includes('rel="next"');

        return {
            incidents,
            ...(hasNext && { next_offset: offset + limit })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
