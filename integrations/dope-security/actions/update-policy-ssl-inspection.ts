import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    policyName: z.string().describe('Policy name. Example: "RegistrySeedPolicy1"'),
    state: z.enum(['enabled', 'disabled']).optional().describe('Set a custom SSL inspection state. Mutually exclusive with inheritsFromBase.'),
    inheritsFromBase: z.boolean().optional().describe('Reset to inherit from the base policy. Mutually exclusive with state.')
});

const ProviderResponseSchema = z.object({
    message: z.string()
});

const OutputSchema = z.object({
    policyName: z.string(),
    sslInspection: z.object({
        state: z.enum(['enabled', 'disabled']).optional(),
        inheritsFromBase: z.boolean().optional()
    })
});

const action = createAction({
    description: 'Set a custom SSL inspection state, or reset to inherit from the base policy (mutually exclusive).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if ((input.state !== undefined && input.inheritsFromBase !== undefined) || (input.state === undefined && input.inheritsFromBase === undefined)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Exactly one of state or inheritsFromBase must be provided.'
            });
        }

        const payload = {
            data: {
                sslInspection: input.state !== undefined ? { state: input.state } : { inheritsFromBase: input.inheritsFromBase }
            }
        };

        const response = await nango.put({
            // https://inflight.dope.security/dope.apis/public-api-specification
            endpoint: `/v1/policies/${encodeURIComponent(input.policyName)}/ssl-inspection`,
            data: payload,
            retries: 1
        });

        ProviderResponseSchema.parse(response.data);

        return {
            policyName: input.policyName,
            sslInspection: {
                ...(input.state !== undefined && { state: input.state }),
                ...(input.inheritsFromBase !== undefined && { inheritsFromBase: input.inheritsFromBase })
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
