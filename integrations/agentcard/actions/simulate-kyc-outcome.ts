import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('The connected user\'s id. Example: "usr_123"'),
    outcome: z.enum(['approved', 'rejected', 'requires_input']).describe('The verdict to apply.'),
    reason: z.string().optional().describe('Optional end-user-safe explanation carried on non-approved outcomes.')
});

const ProviderKycStateSchema = z.object({
    object: z.string().optional(),
    status: z.string(),
    simulated: z.boolean().optional(),
    reason: z.string().optional(),
    required_fields: z.array(z.string()).optional(),
    iframe_url: z.string().optional(),
    warnings: z.array(z.string()).optional(),
    extracted: z.record(z.string(), z.string()).optional()
});

const OutputSchema = z.object({
    status: z.string(),
    simulated: z.boolean().optional(),
    reason: z.string().optional(),
    required_fields: z.array(z.string()).optional(),
    iframe_url: z.string().optional(),
    warnings: z.array(z.string()).optional(),
    extracted: z.record(z.string(), z.string()).optional()
});

const action = createAction({
    description: "Test-mode only: force a connected user's identity verification to a chosen terminal outcome instantly.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.agentcard.sh/api-reference/identity-verification/simulate-an-outcome
            endpoint: '/api/v2/kyc/simulate',
            data: {
                user_id: input.user_id,
                outcome: input.outcome,
                ...(input.reason !== undefined && { reason: input.reason })
            },
            retries: 3
        });

        const providerKyc = ProviderKycStateSchema.parse(response.data);

        return {
            status: providerKyc.status,
            ...(providerKyc.simulated !== undefined && { simulated: providerKyc.simulated }),
            ...(providerKyc.reason !== undefined && { reason: providerKyc.reason }),
            ...(providerKyc.required_fields !== undefined && { required_fields: providerKyc.required_fields }),
            ...(providerKyc.iframe_url !== undefined && { iframe_url: providerKyc.iframe_url }),
            ...(providerKyc.warnings !== undefined && { warnings: providerKyc.warnings }),
            ...(providerKyc.extracted !== undefined && { extracted: providerKyc.extracted })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
