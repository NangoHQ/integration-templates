import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        policyName: z.string().describe('The name of the policy to delete application bypass entries from. Example: "RegistrySeedPolicy1"'),
        mac: z.array(z.string()).optional().describe('List of macOS application names to delete. Example: ["MyApp.app"]'),
        windows: z.array(z.string()).optional().describe('List of Windows application names to delete. Example: ["MyApp.exe"]')
    })
    .refine((input) => (input.mac !== undefined && input.mac.length > 0) || (input.windows !== undefined && input.windows.length > 0), {
        message: 'At least one of mac or windows must be provided'
    });

const ProviderSuccessSchema = z.object({
    message: z.string()
});

const OutputSchema = z.object({
    message: z.string()
});

const action = createAction({
    description: 'Delete custom application bypasses by name and platform.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: {
            data: {
                custom: {
                    mac?: string[];
                    windows?: string[];
                };
            };
        } = {
            data: {
                custom: {}
            }
        };

        if (input.mac !== undefined && input.mac.length > 0) {
            payload.data.custom.mac = input.mac;
        }

        if (input.windows !== undefined && input.windows.length > 0) {
            payload.data.custom.windows = input.windows;
        }

        const response = await nango.delete({
            // https://inflight.dope.security/dope.apis/public-api-specification
            endpoint: `/v1/policies/${encodeURIComponent(input.policyName)}/bypass/applications`,
            data: payload,
            retries: 3
        });

        const providerResponse = ProviderSuccessSchema.parse(response.data);

        return {
            message: providerResponse.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
