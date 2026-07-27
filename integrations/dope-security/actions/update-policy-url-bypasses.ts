import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    policyName: z.string().describe('Name of the policy to update URL bypasses for. Example: "RegistrySeedPolicy1"'),
    inheritsFromBase: z.boolean().optional().describe('Set to true to reset URL bypass configuration to inherit from the Base Policy'),
    custom: z
        .array(
            z.object({
                name: z.string().max(256).describe('URL pattern or name to bypass. Example: "*.example.com"'),
                note: z.string().max(256).optional().describe('Optional note about this bypass entry')
            })
        )
        .optional()
        .describe('Custom URL bypass entries to upsert (matched by name)'),
    default: z
        .array(
            z.object({
                name: z.string().describe('Name of the default bypass entry'),
                state: z.enum(['applied', 'ignored']).describe('Toggle state for this default entry')
            })
        )
        .optional()
        .describe('Default URL bypass entries to update toggle states')
});

const CustomBypassSchema = z.object({
    name: z.string(),
    note: z.string().optional(),
    updatedBy: z.string().optional(),
    updatedAt: z.string().optional()
});

const DefaultBypassSchema = z.object({
    name: z.string(),
    state: z.enum(['applied', 'ignored'])
});

const OutputSchema = z.object({
    inheritsFromBase: z.boolean(),
    custom: z.array(CustomBypassSchema),
    default: z.array(DefaultBypassSchema)
});

const GetUrlBypassResponseSchema = z.object({
    data: z.object({
        inheritsFromBase: z.boolean(),
        custom: z.array(CustomBypassSchema),
        default: z.array(DefaultBypassSchema)
    })
});

const action = createAction({
    description: 'Update custom URL bypasses and toggle default URL bypass entries for a policy, or reset to base policy inheritance.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedPolicyName = encodeURIComponent(input.policyName);

        if (input.inheritsFromBase === true && (input.custom !== undefined || input.default !== undefined)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message:
                    'inheritsFromBase is mutually exclusive with custom and default; it resets all URL bypass configuration to inherit from the base policy.'
            });
        }

        if (input.inheritsFromBase === true) {
            await nango.put({
                // https://inflight.dope.security/dope.apis/public-api-specification
                endpoint: `/v1/policies/${encodedPolicyName}/bypass/urls`,
                data: {
                    data: {
                        inheritsFromBase: true
                    }
                },
                retries: 3
            });
        } else if (input.custom !== undefined || input.default !== undefined) {
            const payload: { custom?: Array<{ name: string; note?: string }>; default?: Array<{ name: string; state: string }> } = {};

            if (input.custom !== undefined) {
                payload.custom = input.custom.map((item) => ({
                    name: item.name,
                    ...(item.note !== undefined && { note: item.note })
                }));
            }

            if (input.default !== undefined) {
                payload.default = input.default;
            }

            await nango.put({
                // https://inflight.dope.security/dope.apis/public-api-specification
                endpoint: `/v1/policies/${encodedPolicyName}/bypass/urls`,
                data: {
                    data: payload
                },
                retries: 3
            });
        } else {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one of inheritsFromBase, custom, or default must be provided.'
            });
        }

        const getResponse = await nango.get({
            // https://inflight.dope.security/dope.apis/public-api-specification
            endpoint: `/v1/policies/${encodedPolicyName}/bypass/urls`,
            retries: 3
        });

        if (getResponse.data === null || getResponse.data === undefined || typeof getResponse.data !== 'object') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected or missing response from get URL bypass API.'
            });
        }

        const parsed = GetUrlBypassResponseSchema.parse(getResponse.data);

        return {
            inheritsFromBase: parsed.data.inheritsFromBase,
            custom: parsed.data.custom,
            default: parsed.data.default
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
