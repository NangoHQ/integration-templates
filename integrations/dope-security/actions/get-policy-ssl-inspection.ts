import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    policyName: z.string().describe('Policy name. Example: "RegistrySeedPolicy1"')
});

const ProviderSslInspectionSchema = z.object({
    inheritsFromBase: z.boolean(),
    state: z.enum(['enabled', 'disabled'])
});

const ProviderResponseSchema = z.object({
    data: z.object({
        sslInspection: ProviderSslInspectionSchema
    })
});

const OutputSchema = z.object({
    sslInspection: z.object({
        inheritsFromBase: z.boolean(),
        state: z.enum(['enabled', 'disabled'])
    })
});

const action = createAction({
    description: "Get a policy's SSL inspection state and inheritance flag.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://inflight.dope.security/dope.apis/public-api-specification
            endpoint: `/v1/policies/${encodeURIComponent(input.policyName)}/ssl-inspection`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            sslInspection: {
                inheritsFromBase: providerResponse.data.sslInspection.inheritsFromBase,
                state: providerResponse.data.sslInspection.state
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
