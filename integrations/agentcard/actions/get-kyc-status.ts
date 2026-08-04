import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('The connected user ID. Example: "cmseows7p000fk604g3qee8bs"')
});

const ProviderKycStatusSchema = z
    .object({
        status: z.string().describe('Current KYC status. Examples: "needs_information", "awaiting_documents", "approved"'),
        required_fields: z.array(z.string()).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    status: z.string().describe('Current KYC status. Examples: "needs_information", "awaiting_documents", "approved"'),
    required_fields: z.array(z.string()).optional()
});

const action = createAction({
    description: "Get a connected user's current identity verification status.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.agentcard.sh
            endpoint: '/api/v2/kyc',
            params: {
                user_id: input.user_id
            },
            retries: 3
        });

        const data = ProviderKycStatusSchema.parse(response.data);

        return {
            status: data.status,
            ...(data.required_fields !== undefined && { required_fields: data.required_fields })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
