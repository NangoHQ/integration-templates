import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    sys_id: z.string().describe('ServiceNow sys_id of the incident. Example: "1c741bd70b2322007518478d83673af3"')
});

const ReferenceFieldSchema = z
    .union([z.string(), z.object({}).passthrough()])
    .nullable()
    .optional();

const OutputSchema = z
    .object({
        sys_id: z.string(),
        number: z.string(),
        short_description: z.string(),
        description: z.string().nullable().optional(),
        state: ReferenceFieldSchema,
        impact: ReferenceFieldSchema,
        urgency: ReferenceFieldSchema,
        priority: ReferenceFieldSchema,
        caller_id: ReferenceFieldSchema,
        opened_by: ReferenceFieldSchema,
        opened_at: z.string().optional(),
        sys_created_on: z.string().optional(),
        sys_updated_on: z.string().optional(),
        active: z.union([z.string(), z.boolean()]).optional(),
        category: z.string().optional(),
        subcategory: z.string().optional(),
        assignment_group: ReferenceFieldSchema,
        assigned_to: ReferenceFieldSchema,
        close_code: z.string().nullable().optional(),
        close_notes: z.string().nullable().optional(),
        comments: z.string().optional(),
        work_notes: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve an incident.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.servicenow.com/dev.do#!/reference/api
            endpoint: `/api/now/table/incident/${encodeURIComponent(input.sys_id)}`,
            retries: 3
        };

        const response = await nango.get(config);

        const apiResponse = z
            .object({
                result: z.unknown()
            })
            .parse(response.data);

        const providerIncident = OutputSchema.parse(apiResponse.result);

        return providerIncident;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
