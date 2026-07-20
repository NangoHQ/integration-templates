import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    list_id: z.string().describe('The ID of the list to retrieve. Example: "fa1dbbb4-10af-42d7-b07e-d1ab501a805b"')
});

const ProviderMetadataSchema = z.object({
    self: z.string().optional()
});

const ProviderListSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    contact_count: z.number().optional(),
    identifier_counts: z.record(z.string(), z.number()).optional(),
    _metadata: ProviderMetadataSchema.optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    contact_count: z.number().optional(),
    identifier_counts: z.record(z.string(), z.number()).optional(),
    _metadata: z
        .object({
            self: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Get a single contact list by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['marketing.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://www.twilio.com/docs/sendgrid/api-reference/lists/get-a-list-by-id
            endpoint: `/v3/marketing/lists/${encodeURIComponent(input.list_id)}`,
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'List not found',
                list_id: input.list_id
            });
        }

        const providerList = ProviderListSchema.parse(response.data);

        return {
            id: providerList.id,
            ...(providerList.name !== undefined && { name: providerList.name }),
            ...(providerList.contact_count !== undefined && { contact_count: providerList.contact_count }),
            ...(providerList.identifier_counts !== undefined && { identifier_counts: providerList.identifier_counts }),
            ...(providerList._metadata !== undefined && { _metadata: providerList._metadata })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
