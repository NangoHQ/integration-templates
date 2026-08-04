import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    service_account_id: z.string().trim().min(1).describe('The ID of the service account. Example: "39886536-8f56-11f1-88dd-3619de0c3ef9"'),
    name: z.string().describe('Name of the application key. Example: "Test Key"')
});

const ProviderApplicationKeySchema = z
    .object({
        data: z
            .object({
                type: z.string(),
                id: z.string(),
                attributes: z
                    .object({
                        name: z.string(),
                        created_at: z.string().optional(),
                        last4: z.string().optional(),
                        key: z.string().optional()
                    })
                    .passthrough()
            })
            .passthrough()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    created_at: z.string().optional(),
    last4: z.string().optional(),
    key: z.string().optional()
});

const action = createAction({
    description: 'Create an application key owned by a service account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.datadoghq.com/api/latest/service-accounts/#create-an-application-key-for-a-service-account
            endpoint: `v2/service_accounts/${encodeURIComponent(input.service_account_id)}/application_keys`,
            data: {
                data: {
                    type: 'application_keys',
                    attributes: {
                        name: input.name
                    }
                }
            },
            retries: 3
        });

        const parsed = ProviderApplicationKeySchema.parse(response.data);

        return {
            id: parsed.data.id,
            name: parsed.data.attributes.name,
            type: parsed.data.type,
            ...(parsed.data.attributes.created_at !== undefined && {
                created_at: parsed.data.attributes.created_at
            }),
            ...(parsed.data.attributes.last4 !== undefined && {
                last4: parsed.data.attributes.last4
            }),
            ...(parsed.data.attributes.key !== undefined && {
                key: parsed.data.attributes.key
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
