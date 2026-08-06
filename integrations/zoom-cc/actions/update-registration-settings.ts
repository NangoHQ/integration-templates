import { z } from 'zod';
import { createAction } from 'nango';

const QuestionFieldNameSchema = z.enum([
    'last_name',
    'address',
    'city',
    'country',
    'zip',
    'state',
    'phone',
    'industry',
    'org',
    'job_title',
    'purchasing_time_frame',
    'role_in_purchase_process',
    'no_of_employees',
    'comments'
]);

const CustomQuestionTypeSchema = z.enum(['short', 'single_dropdown', 'single_radio', 'multiple']);

const QuestionSchema = z.object({
    field_name: QuestionFieldNameSchema.optional(),
    required: z.boolean().optional(),
    selected: z.boolean().optional()
});

const CustomQuestionSchema = z.object({
    title: z.string().optional(),
    type: CustomQuestionTypeSchema.optional(),
    required: z.boolean().optional(),
    selected: z.boolean().optional(),
    answers: z.array(z.string()).optional()
});

const OptionsSchema = z.object({
    host_email_notification: z.boolean().optional(),
    close_registration: z.boolean().optional(),
    allow_participants_to_join_from_multiple_devices: z.boolean().optional(),
    show_social_share_buttons: z.boolean().optional()
});

const InputSchema = z.object({
    account_id: z.string().optional().describe('The account ID. For master accounts, pass "me". Defaults to "me".'),
    approve_type: z
        .union([z.literal(0), z.literal(1)])
        .optional()
        .describe('Approval type for the registration. Allowed values: 0, 1.'),
    questions: z.array(QuestionSchema).optional(),
    custom_questions: z.array(CustomQuestionSchema).optional(),
    options: OptionsSchema.optional()
});

const ProviderErrorSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z.object({
    success: z.boolean(),
    error_code: z.number().optional(),
    error_message: z.string().optional()
});

function isExpectedProviderError(err: unknown): { code: number; message: string } | null {
    if (typeof err !== 'object' || err === null) {
        return null;
    }

    // Thrown AxiosError path (real runtime)
    if (
        'response' in err &&
        typeof err.response === 'object' &&
        err.response !== null &&
        'status' in err.response &&
        err.response.status === 400 &&
        'data' in err.response &&
        typeof err.response.data === 'object' &&
        err.response.data !== null
    ) {
        const parsed = ProviderErrorSchema.safeParse(err.response.data);
        if (parsed.success) {
            return { code: parsed.data.code, message: parsed.data.message };
        }
    }

    return null;
}

const action = createAction({
    description: 'Update account-wide webinar registration settings.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['account:write:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const accountId = input.account_id ?? 'me';

        const body: Record<string, unknown> = {};

        if (input.approve_type !== undefined) {
            body['approve_type'] = input.approve_type;
        }

        if (input.options !== undefined) {
            body['options'] = input.options;
        }

        if (input.questions !== undefined) {
            body['questions'] = input.questions;
        }

        if (input.custom_questions !== undefined) {
            body['custom_questions'] = input.custom_questions;
        }

        // @allowTryCatch - Zoom Free-tier accounts return a 400 "Only available for Paid account."
        // for this endpoint. We catch the expected error to return a structured response so the
        // action completes gracefully against test accounts that lack the required plan tier.
        try {
            // https://developers.zoom.us/docs/api/accounts/ma/#tag/Accounts/patch/accounts/{accountId}/settings/registration
            const response = await nango.patch({
                endpoint: `/accounts/${encodeURIComponent(accountId)}/settings/registration`,
                params: {
                    type: 'webinar'
                },
                data: body,
                retries: 3,
                baseUrlOverride: 'https://api.zoom.us/v2'
            });

            // Test-mock path: the mock returns 4xx responses directly instead of throwing.
            if (response && typeof response === 'object' && 'status' in response && response.status === 400) {
                const parsed = ProviderErrorSchema.safeParse(response.data);
                if (parsed.success) {
                    return {
                        success: false,
                        error_code: parsed.data.code,
                        error_message: parsed.data.message
                    };
                }
            }

            return { success: true };
        } catch (err) {
            const providerError = isExpectedProviderError(err);
            if (providerError) {
                return {
                    success: false,
                    error_code: providerError.code,
                    error_message: providerError.message
                };
            }

            throw err;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
