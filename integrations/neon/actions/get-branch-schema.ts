import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/neondatabase/neon-pkgs/af5a839e5900dc98120af6261b5b29d02c74a8e1/packages/sdk/spec/neon-openapi.json
// Operation: getProjectBranchSchema
const InputSchema = z
    .object({
        project_id: z.string().regex(new RegExp('^[a-z0-9-]{1,60}$')).describe('The Neon project ID'),
        branch_id: z.string().regex(new RegExp('^[a-z0-9-]{1,60}$')).describe('The branch ID'),
        db_name: z.string().describe('Name of the database for which the schema is retrieved'),
        lsn: z.string().describe('The Log Sequence Number (LSN) for which the schema is retrieved\n').optional(),
        timestamp: z.string().datetime({ offset: true }).describe('The point in time for which the schema is retrieved\n').optional(),
        format: z.enum(['sql', 'json']).describe('The format of the schema to retrieve. Possible values:\n- `sql` (default)\n- `json`\n').optional()
    })
    .refine((input) => input.lsn === undefined || input.timestamp === undefined, { message: 'Use either lsn or timestamp, not both' });

const ProviderResponseSchema = z
    .object({
        sql: z.string().optional(),
        json: z
            .object({
                tables: z.array(
                    z
                        .object({
                            schema: z.string(),
                            name: z.string(),
                            columns: z.array(
                                z
                                    .object({ name: z.string(), type: z.string(), nullable: z.boolean().optional(), generated: z.boolean().optional() })
                                    .passthrough()
                            ),
                            constraints: z
                                .array(
                                    z
                                        .object({
                                            type: z.string(),
                                            columns: z.array(z.string()).min(1),
                                            name: z.string().optional(),
                                            referenced_table: z
                                                .object({ schema: z.string(), table: z.string(), columns: z.array(z.string()) })
                                                .passthrough()
                                                .optional()
                                        })
                                        .passthrough()
                                )
                                .optional()
                        })
                        .passthrough()
                )
            })
            .passthrough()
            .optional()
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description:
        "Retrieve database schema. Retrieves the database schema. Specify `lsn` or `timestamp` (not both) to read at a point in time; omit both to read from the database's head.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input['db_name'] !== undefined) params['db_name'] = input['db_name'];
        if (input['lsn'] !== undefined) params['lsn'] = input['lsn'];
        if (input['timestamp'] !== undefined) params['timestamp'] = input['timestamp'];
        if (input['format'] !== undefined) params['format'] = input['format'];
        const config: ProxyConfiguration = {
            // https://raw.githubusercontent.com/neondatabase/neon-pkgs/af5a839e5900dc98120af6261b5b29d02c74a8e1/packages/sdk/spec/neon-openapi.json,
            endpoint: `/v2/projects/${encodeURIComponent(input['project_id'])}/branches/${encodeURIComponent(input['branch_id'])}/schema`,
            retries: 3,
            params
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
