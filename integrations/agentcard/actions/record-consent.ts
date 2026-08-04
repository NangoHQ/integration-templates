import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('The connected user\'s id. Example: "user_7g8h9i"'),
    terms_version: z.string().max(64).optional().describe('Optional. The version of your terms the user accepted, stored for your audit trail.')
});

const ProviderConsentSchema = z.object({
    object: z.literal('consent'),
    id: z.string(),
    user_id: z.string(),
    terms_version: z.string().nullable(),
    created_at: z.string()
});

const OutputSchema = z.object({
    object: z.literal('consent'),
    id: z.string(),
    user_id: z.string(),
    terms_version: z.string().optional(),
    created_at: z.string()
});

const action = createAction({
    description: 'Record that a connected user authorized your platform to act on their behalf.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.agentcard.sh/api-reference/connect/consent
            endpoint: '/api/v2/connect/consent',
            data: {
                user_id: input.user_id,
                ...(input.terms_version !== undefined && { terms_version: input.terms_version })
            },
            retries: 3
        });

        const providerConsent = ProviderConsentSchema.parse(response.data);

        return {
            object: providerConsent.object,
            id: providerConsent.id,
            user_id: providerConsent.user_id,
            ...(providerConsent.terms_version != null && { terms_version: providerConsent.terms_version }),
            created_at: providerConsent.created_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
