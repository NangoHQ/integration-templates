import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email: z.string().email().describe('Email address of the account to mark as fixed. Example: "user@example.com"')
});

const ProviderAccountSchema = z.object({
    email: z.string(),
    timestamp_created: z.string(),
    timestamp_updated: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    status: z.number().optional(),
    status_message: z
        .object({
            code: z.string().optional(),
            command: z.string().optional(),
            response: z.string().optional(),
            e_message: z.string().optional(),
            responseCode: z.number().optional()
        })
        .optional(),
    provider_code: z.number(),
    setup_pending: z.boolean(),
    is_managed_account: z.boolean(),
    warmup_status: z.number().optional(),
    daily_limit: z.number().nullable().optional(),
    tracking_domain_name: z.string().nullable().optional(),
    tracking_domain_status: z.string().nullable().optional(),
    organization: z.string().optional(),
    added_by: z.string().nullable().optional(),
    modified_by: z.string().nullable().optional()
});

const OutputSchema = z.object({
    email: z.string(),
    status: z.number().optional(),
    status_message: z
        .object({
            code: z.string().optional(),
            command: z.string().optional(),
            response: z.string().optional(),
            e_message: z.string().optional(),
            response_code: z.number().optional()
        })
        .optional(),
    provider_code: z.number(),
    setup_pending: z.boolean(),
    is_managed_account: z.boolean(),
    warmup_status: z.number().optional(),
    daily_limit: z.number().optional(),
    tracking_domain_name: z.string().optional(),
    tracking_domain_status: z.string().optional(),
    organization: z.string().optional()
});

const action = createAction({
    description: 'Mark an account as fixed.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedEmail = encodeURIComponent(input.email);

        const response = await nango.post({
            // https://developer.instantly.ai/api-reference/account/mark-an-account-as-fixed
            endpoint: `/v2/accounts/${encodedEmail}/mark-fixed`,
            retries: 3
        });

        const providerAccount = ProviderAccountSchema.parse(response.data);

        return {
            email: providerAccount.email,
            ...(providerAccount.status !== undefined && { status: providerAccount.status }),
            ...(providerAccount.status_message !== undefined && {
                status_message: {
                    ...(providerAccount.status_message.code !== undefined && { code: providerAccount.status_message.code }),
                    ...(providerAccount.status_message.command !== undefined && { command: providerAccount.status_message.command }),
                    ...(providerAccount.status_message.response !== undefined && { response: providerAccount.status_message.response }),
                    ...(providerAccount.status_message.e_message !== undefined && { e_message: providerAccount.status_message.e_message }),
                    ...(providerAccount.status_message.responseCode !== undefined && { response_code: providerAccount.status_message.responseCode })
                }
            }),
            provider_code: providerAccount.provider_code,
            setup_pending: providerAccount.setup_pending,
            is_managed_account: providerAccount.is_managed_account,
            ...(providerAccount.warmup_status !== undefined && { warmup_status: providerAccount.warmup_status }),
            ...(providerAccount.daily_limit != null && { daily_limit: providerAccount.daily_limit }),
            ...(providerAccount.tracking_domain_name != null && { tracking_domain_name: providerAccount.tracking_domain_name }),
            ...(providerAccount.tracking_domain_status != null && { tracking_domain_status: providerAccount.tracking_domain_status }),
            ...(providerAccount.organization !== undefined && { organization: providerAccount.organization })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
