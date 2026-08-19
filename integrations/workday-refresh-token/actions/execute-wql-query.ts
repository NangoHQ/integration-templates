import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        query: z.string().describe('The WQL query string. Example: SELECT workdayID, fullName FROM allWorkers WHERE isActive = true'),
        limit: z.number().int().min(1).max(10000).optional().describe('Maximum number of rows to return per page. Defaults vary by tenant; maximum is 10,000.'),
        offset: z.number().int().min(0).optional().describe('Zero-based index of the first row to return. Use with limit for pagination.')
    })
    .describe('Input for executing a Workday Query Language (WQL) query');

const ProviderResponseSchema = z.object({
    total: z.number(),
    data: z.array(z.record(z.string(), z.unknown()))
});

const OutputSchema = z
    .object({
        total: z.number().describe('Total number of rows matching the query across all pages.'),
        rows: z
            .array(z.record(z.string(), z.unknown()))
            .describe('Result rows from the WQL query. Each object contains key-value pairs corresponding to the selected fields.')
    })
    .describe('Output of a Workday Query Language (WQL) query execution');

/**
 * @tags: [read]
 * @tagReason: Executes a read-only WQL query against the Workday tenant.
 * @pitfalls: The WQL LIMIT clause caps the total result set, while the limit parameter only controls page size; Workday reference fields return nested {descriptor, id} objects rather than plain strings.
 */
const action = createAction({
    description: 'Execute a Workday Query Language (WQL) query and return structured tabular results',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_wql'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const tenant = connection.connection_config?.['tenant'];

        if (!tenant || typeof tenant !== 'string') {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Tenant is missing in connection configuration.'
            });
        }

        const endpoint = `/wql/v1/${encodeURIComponent(tenant)}/data`;

        let response;
        if (input.query.length > 2048) {
            // https://developer.workday.com/documentation/GUID-5c940864-7651-4e28-a9d2-79b45292e66a-enHYPHENus
            response = await nango.post({
                endpoint,
                data: {
                    query: input.query,
                    ...(input.limit !== undefined && { limit: input.limit }),
                    ...(input.offset !== undefined && { offset: input.offset })
                },
                retries: 3
            });
        } else {
            // https://developer.workday.com/documentation/GUID-5c940864-7651-4e28-a9d2-79b45292e66a-enHYPHENus
            response = await nango.get({
                endpoint,
                params: {
                    query: input.query,
                    ...(input.limit !== undefined && { limit: String(input.limit) }),
                    ...(input.offset !== undefined && { offset: String(input.offset) })
                },
                retries: 3
            });
        }

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The WQL response did not match the expected shape.',
                details: parsed.error.message
            });
        }

        return {
            total: parsed.data.total,
            rows: parsed.data.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
