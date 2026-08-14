import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderOutputSchema = z.object({
    trusted_domains: z.array(z.string()).describe("A list of the account's trusted domains.")
});

const OutputSchema = z.object({
    trusted_domains: z.array(z.string()).describe("A list of the account's trusted domains.")
});

const action = createAction({
    description: 'List domains trusted by this account (used for auto-provisioning/SSO).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['account:read:trusted_domains:master'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch Zoom returns 400 for free-tier accounts that do not support trusted domains.
        // We gracefully return an empty list so the action succeeds on all account tiers.
        try {
            const response = await nango.get({
                // https://developers.zoom.us/docs/api/rest/reference/account/ma/#operation/accountTrustedDomain
                endpoint: '/accounts/me/trusted_domains',
                baseUrlOverride: 'https://api.zoom.us/v2',
                retries: 3
            });

            if (
                response.status === 400 &&
                typeof response.data === 'object' &&
                response.data !== null &&
                'code' in response.data &&
                response.data.code === 200 &&
                'message' in response.data &&
                typeof response.data.message === 'string' &&
                response.data.message.includes('Only available for Paid account')
            ) {
                return { trusted_domains: [] };
            }

            const parsed = ProviderOutputSchema.parse(response.data);

            return {
                trusted_domains: parsed.trusted_domains
            };
        } catch (error) {
            const axiosErrorSchema = z.object({
                response: z.object({
                    status: z.number(),
                    data: z.object({
                        code: z.number().optional(),
                        message: z.string().optional()
                    })
                })
            });

            const nangoErrorSchema = z.object({
                status: z.number(),
                payload: z.object({
                    code: z.number().optional(),
                    message: z.string().optional()
                })
            });

            const axiosResult = axiosErrorSchema.safeParse(error);
            if (axiosResult.success) {
                const data = axiosResult.data.response.data;
                if (
                    axiosResult.data.response.status === 400 &&
                    data.code === 200 &&
                    data.message != null &&
                    data.message.includes('Only available for Paid account')
                ) {
                    return { trusted_domains: [] };
                }
            }

            const nangoResult = nangoErrorSchema.safeParse(error);
            if (nangoResult.success) {
                const payload = nangoResult.data.payload;
                if (
                    nangoResult.data.status === 400 &&
                    payload.code === 200 &&
                    payload.message != null &&
                    payload.message.includes('Only available for Paid account')
                ) {
                    return { trusted_domains: [] };
                }
            }

            throw error;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
