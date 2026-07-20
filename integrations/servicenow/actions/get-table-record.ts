import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    table_name: z.string().describe('The name of the ServiceNow table. Example: "incident"'),
    sys_id: z.string().describe('The sys_id of the record to retrieve. Example: "78058ff5c3ca0310c5a8fc0d0501317d"'),
    sysparm_fields: z.string().optional().describe('Comma-separated list of fields to return. Example: "number,short_description,state"'),
    sysparm_display_value: z.string().optional().describe('Return display values for reference fields. Use "true", "false", or "all".'),
    sysparm_exclude_reference_link: z.boolean().optional().describe('Exclude reference links from response.'),
    sysparm_view: z.string().optional().describe('View to determine which fields are returned.')
});

const ProviderResponseSchema = z.object({
    result: z.record(z.string(), z.unknown())
});

const OutputSchema = z.record(z.string(), z.unknown());

const action = createAction({
    description: 'Retrieve an allowed table record.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.servicenow.com/dev.do#!/reference/api/now/rest/table-api
        const response = await nango.get({
            endpoint: `/api/now/table/${encodeURIComponent(input.table_name)}/${encodeURIComponent(input.sys_id)}`,
            params: {
                ...(input.sysparm_fields !== undefined && { sysparm_fields: input.sysparm_fields }),
                ...(input.sysparm_display_value !== undefined && { sysparm_display_value: input.sysparm_display_value }),
                ...(input.sysparm_exclude_reference_link !== undefined && { sysparm_exclude_reference_link: String(input.sysparm_exclude_reference_link) }),
                ...(input.sysparm_view !== undefined && { sysparm_view: input.sysparm_view })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Record not found',
                table_name: input.table_name,
                sys_id: input.sys_id
            });
        }

        const providerData = ProviderResponseSchema.parse(response.data);
        return providerData.result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
