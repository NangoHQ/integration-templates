import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    accountId: z.string().describe('FreshBooks account ID. Example: "ZyQ04o"')
});

const InputSchema = z.object({
    clientId: z.string().describe('FreshBooks client ID. Example: "567521"')
});

const ProviderClientSchema = z
    .object({
        id: z.number(),
        fname: z.string().nullable().optional(),
        lname: z.string().nullable().optional(),
        organization: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        note: z.string().nullable().optional(),
        language: z.string().nullable().optional(),
        currency_code: z.string().nullable().optional(),
        created_at: z.string().nullable().optional(),
        updated_at: z.string().nullable().optional(),
        vis_state: z.number().nullable().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    response: z.object({
        result: z.object({
            client: ProviderClientSchema
        })
    })
});

const OutputSchema = z
    .object({
        id: z.number(),
        fname: z.string().nullable().optional(),
        lname: z.string().nullable().optional(),
        organization: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        note: z.string().nullable().optional(),
        language: z.string().nullable().optional(),
        currency_code: z.string().nullable().optional(),
        created_at: z.string().nullable().optional(),
        updated_at: z.string().nullable().optional(),
        vis_state: z.number().nullable().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a single client.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['user:clients:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
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
        const response = await nango.get({
            endpoint: `/accounting/account/${encodeURIComponent(accountId)}/users/clients/${encodeURIComponent(input.clientId)}`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from FreshBooks API.',
                details: parsed.error.issues
            });
        }

        return parsed.data.response.result.client;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
