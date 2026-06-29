import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    clientId: z.string().describe('Client ID. Example: "567521"')
});

const MetadataSchema = z.object({
    accountId: z.string().describe('FreshBooks account ID. Example: "ZyQ04o"')
});

const ProviderClientSchema = z
    .object({
        id: z.union([z.string(), z.number()]),
        vis_state: z.number().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.union([z.string(), z.number()]),
    vis_state: z.number().optional()
});

const action = createAction({
    description: 'Archive (soft-delete) a client',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['user:clients:write'],

    exec: async (nango, input) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);

        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in metadata.'
            });
        }

        const accountId = parsedMetadata.data.accountId;

        // https://www.freshbooks.com/api/clients
        const response = await nango.put({
            endpoint: `/accounting/account/${encodeURIComponent(accountId)}/users/clients/${encodeURIComponent(input.clientId)}`,
            data: {
                client: {
                    vis_state: 1
                }
            },
            retries: 10
        });

        const providerResponse = z
            .object({
                response: z.object({
                    result: z.object({
                        client: ProviderClientSchema
                    })
                })
            })
            .safeParse(response.data);

        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response format from FreshBooks API.'
            });
        }

        const client = providerResponse.data.response.result.client;

        return {
            id: client.id,
            ...(client.vis_state !== undefined && { vis_state: client.vis_state })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
