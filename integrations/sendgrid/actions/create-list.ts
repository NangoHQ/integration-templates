import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().min(1).max(100).describe('The name for the new contact list. Example: "Newsletter Subscribers"')
});

const ProviderListSchema = z.object({
    id: z.string(),
    name: z.string(),
    contact_count: z.number().int().optional(),
    _metadata: z
        .object({
            self: z.string()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    contact_count: z.number().int().optional(),
    metadata_self: z.string().optional()
});

const action = createAction({
    description: 'Create a contact list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.twilio.com/docs/sendgrid/api-reference/lists/create-list
            endpoint: '/v3/marketing/lists',
            data: {
                name: input.name
            },
            retries: 10
        });

        const providerList = ProviderListSchema.parse(response.data);

        return {
            id: providerList.id,
            name: providerList.name,
            ...(providerList.contact_count !== undefined && { contact_count: providerList.contact_count }),
            ...(providerList._metadata?.self != null && { metadata_self: providerList._metadata.self })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
