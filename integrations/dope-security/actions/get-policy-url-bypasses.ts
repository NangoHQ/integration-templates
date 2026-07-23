import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    policyName: z.string().describe('Policy name. Example: "RegistrySeedPolicy1"')
});

const BypassEntrySchema = z.object({
    name: z.string(),
    state: z.string()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        inheritsFromBase: z.boolean(),
        custom: z.array(BypassEntrySchema),
        default: z.array(BypassEntrySchema)
    })
});

const OutputSchema = z.object({
    data: z.object({
        inheritsFromBase: z.boolean(),
        custom: z.array(
            z.object({
                name: z.string(),
                state: z.string()
            })
        ),
        default: z.array(
            z.object({
                name: z.string(),
                state: z.string()
            })
        )
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
                custom: parsed.data.custom.map((entry) => ({
                    name: entry.name,
                    state: entry.state
                })),
                default: parsed.data.default.map((entry) => ({
                    name: entry.name,
                    state: entry.state
                }))
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
