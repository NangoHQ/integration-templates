import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    policyName: z.string().describe('Policy name. Example: "RegistrySeedPolicy1"')
});

const CustomBypassEntrySchema = z.object({
    name: z.string(),
    note: z.string().optional(),
    updatedBy: z.string().optional(),
    updatedAt: z.string().optional()
});

const DefaultBypassEntrySchema = z.object({
    name: z.string(),
    state: z.enum(['applied', 'ignored'])
});

const ProviderResponseSchema = z.object({
    data: z.object({
        inheritsFromBase: z.boolean(),
        custom: z.array(CustomBypassEntrySchema),
        default: z.array(DefaultBypassEntrySchema)
    })
});

const OutputSchema = z.object({
    data: z.object({
        inheritsFromBase: z.boolean(),
        custom: z.array(CustomBypassEntrySchema),
        default: z.array(DefaultBypassEntrySchema)
    })
});

const action = createAction({
    description: "Retrieve a policy's URL bypass entries (custom and default, with toggle state).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://inflight.dope.security/dope.apis/public-api-specification
            endpoint: `/v1/policies/${encodeURIComponent(input.policyName)}/bypass/urls`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            data: {
                inheritsFromBase: parsed.data.inheritsFromBase,
                custom: parsed.data.custom,
                default: parsed.data.default
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
