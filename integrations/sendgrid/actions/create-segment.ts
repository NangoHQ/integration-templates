import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Segment name. Example: "Active Gmail Users"'),
    query_dsl: z
        .string()
        .describe('SQL query selecting contact_id and updated_at. Example: "SELECT contact_id, updated_at FROM contact_data WHERE email LIKE \'%gmail.com\'"'),
    parent_list_ids: z.array(z.string()).optional().describe('Optional list IDs to scope the segment to. Example: ["fa1dbbb4-10af-42d7-b07e-d1ab501a805b"]')
});

const ProviderStatusSchema = z.object({
    query_validation: z.string()
});

const ProviderResponseSchema = z.object({
    id: z.string(),
    name: z.string(),
    query_dsl: z.string(),
    status: ProviderStatusSchema,
    parent_list_ids: z.array(z.string()).nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    query_dsl: z.string(),
    query_validation: z.string(),
    parent_list_ids: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Create a segment from a SQL query over contacts.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.twilio.com/docs/sendgrid/api-reference/segments/create-segment
            endpoint: '/v3/marketing/segments/2.0',
            data: {
                name: input.name,
                query_dsl: input.query_dsl,
                ...(input.parent_list_ids !== undefined && { parent_list_ids: input.parent_list_ids })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.id,
            name: providerResponse.name,
            query_dsl: providerResponse.query_dsl,
            query_validation: providerResponse.status.query_validation,
            ...(Array.isArray(providerResponse.parent_list_ids) && { parent_list_ids: providerResponse.parent_list_ids })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
