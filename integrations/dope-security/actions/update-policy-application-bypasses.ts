import { z } from 'zod';
import { createAction } from 'nango';

const CustomBypassItemSchema = z.object({
    name: z.string().describe('The name of the application to bypass. Example: "MyApp.app"'),
    note: z.string().optional().describe('Optional note about this bypass entry.')
});

const DefaultBypassItemSchema = z.object({
    name: z.string().describe('The name of the default bypass entry.'),
    state: z.enum(['applied', 'ignored']).describe('Whether this default entry is applied or ignored.')
});

const PlatformCustomBypassSchema = z.object({
    mac: z.array(CustomBypassItemSchema).optional().describe('Custom bypass applications on macOS.'),
    windows: z.array(CustomBypassItemSchema).optional().describe('Custom bypass applications on Windows.')
});

const PlatformDefaultBypassSchema = z.object({
    mac: z.array(DefaultBypassItemSchema).optional().describe('Default bypass applications on macOS.'),
    windows: z.array(DefaultBypassItemSchema).optional().describe('Default bypass applications on Windows.')
});

const InputSchema = z.object({
    policyName: z.string().describe('The name of the policy to update. Example: "RegistrySeedPolicy1"'),
    inheritsFromBase: z.boolean().optional().describe('Set to true to reset the policy to inherit all application bypass configuration from the base policy.'),
    custom: PlatformCustomBypassSchema.optional().describe('Custom application entries to upsert, keyed by platform.'),
    default: PlatformDefaultBypassSchema.optional().describe('Default application entries with updated toggle states, keyed by platform.')
});

const OutputSchema = z.object({
    message: z.string()
});

interface BypassPayload {
    inheritsFromBase?: boolean;
    custom?: {
        mac?: Array<{ name: string; note?: string }>;
        windows?: Array<{ name: string; note?: string }>;
    };
    default?: {
        mac?: Array<{ name: string; state: 'applied' | 'ignored' }>;
        windows?: Array<{ name: string; state: 'applied' | 'ignored' }>;
    };
}

const action = createAction({
    description: 'Upsert custom application bypasses, or toggle defaults, per platform.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.inheritsFromBase && !input.custom && !input.default) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one of inheritsFromBase, custom, or default must be provided.'
            });
        }

        const payload: BypassPayload = {};

        if (input.inheritsFromBase) {
            payload.inheritsFromBase = true;
        } else {
            if (input.custom) {
                const customPayload: { mac?: Array<{ name: string; note?: string }>; windows?: Array<{ name: string; note?: string }> } = {};
                if (input.custom.mac !== undefined) {
                    customPayload.mac = input.custom.mac.map((item) => ({
                        name: item.name,
                        ...(item.note !== undefined && { note: item.note })
                    }));
                }
                if (input.custom.windows !== undefined) {
                    customPayload.windows = input.custom.windows.map((item) => ({
                        name: item.name,
                        ...(item.note !== undefined && { note: item.note })
                    }));
                }
                if (Object.keys(customPayload).length > 0) {
                    payload.custom = customPayload;
                }
            }

            if (input.default) {
                const defaultPayload: {
                    mac?: Array<{ name: string; state: 'applied' | 'ignored' }>;
                    windows?: Array<{ name: string; state: 'applied' | 'ignored' }>;
                } = {};
                if (input.default.mac !== undefined) {
                    defaultPayload.mac = input.default.mac;
                }
                if (input.default.windows !== undefined) {
                    defaultPayload.windows = input.default.windows;
                }
                if (Object.keys(defaultPayload).length > 0) {
                    payload.default = defaultPayload;
                }
            }
        }

        if (Object.keys(payload).length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one platform must be provided under custom or default when inheritsFromBase is not set.'
            });
        }

        // https://inflight.dope.security/dope.apis/public-api-specification
        const response = await nango.put({
            endpoint: `/v1/policies/${encodeURIComponent(input.policyName)}/bypass/applications`,
            data: {
                data: payload
            },
            retries: 1
        });

        const output = OutputSchema.parse(response.data);
        return output;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
