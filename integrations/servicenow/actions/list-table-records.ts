import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    allowed_tables: z.array(z.string()).describe('Explicitly permitted table names for this action.')
});

const InputSchema = z.object({
    table_name: z.string().describe('ServiceNow table name to query. Example: "incident"'),
    sysparm_query: z.string().optional().describe('Encoded query string for filtering records. Example: "active=true"'),
    sysparm_fields: z.string().optional().describe('Comma-separated list of fields to return. Example: "sys_id,number,short_description"'),
    sysparm_limit: z.number().optional().describe('Maximum number of records to return. Default and maximum is typically 10000.'),
    sysparm_offset: z.number().optional().describe('Number of records to skip before returning results.')
});

const OutputSchema = z.object({
    records: z.array(z.record(z.string(), z.unknown())),
    next_offset: z.number().optional(),
    total_count: z.number().optional()
});

const action = createAction({
    description: 'List records from an allowed table.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['itil', 'admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const rawMetadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(rawMetadata);
        if (!metadataResult.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'Metadata must include allowed_tables array.',
                details: metadataResult.error.issues
            });
        }

        const allowedTables = metadataResult.data.allowed_tables;
        if (!allowedTables.includes(input.table_name)) {
            throw new nango.ActionError({
                type: 'forbidden_table',
                message: `Table "${input.table_name}" is not in the allowed tables list.`
            });
        }

        const params: Record<string, string | number> = {};
        if (input.sysparm_query !== undefined) {
            params['sysparm_query'] = input.sysparm_query;
        }
        if (input.sysparm_fields !== undefined) {
            params['sysparm_fields'] = input.sysparm_fields;
        }
        if (input.sysparm_limit !== undefined) {
            params['sysparm_limit'] = input.sysparm_limit;
        }
        if (input.sysparm_offset !== undefined) {
            params['sysparm_offset'] = input.sysparm_offset;
        }

        // https://developer.servicenow.com/dev.do#!/reference/api
        const response = await nango.get({
            endpoint: `/api/now/table/${encodeURIComponent(input.table_name)}`,
            params,
            retries: 3
        });

        const unknownData = response.data;
        if (typeof unknownData !== 'object' || unknownData === null || !('result' in unknownData) || !Array.isArray(unknownData.result)) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response format from ServiceNow Table API.'
            });
        }

        const records: Record<string, unknown>[] = [];
        for (const item of unknownData.result) {
            if (typeof item === 'object' && item !== null) {
                records.push(item);
            }
        }

        const totalCountHeader = response.headers['x-total-count'];
        let totalCount: number | undefined;
        if (typeof totalCountHeader === 'string') {
            totalCount = parseInt(totalCountHeader, 10);
        } else if (typeof totalCountHeader === 'number') {
            totalCount = totalCountHeader;
        }

        const linkHeader = response.headers['link'];
        let nextOffset: number | undefined;
        if (typeof linkHeader === 'string' && linkHeader.includes('rel="next"')) {
            const currentOffset = input.sysparm_offset ?? 0;
            const currentLimit = input.sysparm_limit ?? 10000;
            nextOffset = currentOffset + currentLimit;
        }

        return {
            records,
            ...(nextOffset !== undefined && { next_offset: nextOffset }),
            ...(totalCount !== undefined && { total_count: totalCount })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
