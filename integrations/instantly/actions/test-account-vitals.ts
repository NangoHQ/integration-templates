import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    accounts: z.array(z.string()).optional().describe('List of sending account emails to test. Example: ["user@example.com"]')
});

const VitalResultSchema = z.object({
    domain: z.string(),
    allPass: z.boolean(),
    mx: z.boolean(),
    spf: z.boolean(),
    dkim: z.boolean(),
    dmarc: z.boolean()
});

const OutputSchema = z.object({
    status: z.string().optional(),
    success_list: z.array(VitalResultSchema).optional(),
    failure_list: z.array(VitalResultSchema).optional()
});

const action = createAction({
    description: 'Test account vitals (SPF, DKIM, DMARC, blacklists).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/test-account-vitals',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.accounts || input.accounts.length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one account email is required.'
            });
        }

        const response = await nango.post({
            // https://developer.instantly.ai/api-reference/account/test-account-vitals
            endpoint: '/v2/accounts/test/vitals',
            data: {
                accounts: input.accounts
            },
            retries: 3
        });

        const data = z
            .object({
                status: z.string().optional(),
                success_list: z.array(VitalResultSchema).optional(),
                failure_list: z.array(VitalResultSchema).optional()
            })
            .parse(response.data);

        return {
            ...(data.status !== undefined && { status: data.status }),
            ...(data.success_list !== undefined && { success_list: data.success_list }),
            ...(data.failure_list !== undefined && { failure_list: data.failure_list })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
