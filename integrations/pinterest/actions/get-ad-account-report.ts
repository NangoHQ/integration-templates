import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    token: z.string().describe('Token returned from the create-ad-account-report call.')
});

const OutputSchema = z.object({
    report_status: z.enum(['DOES_NOT_EXIST', 'FINISHED', 'IN_PROGRESS', 'EXPIRED', 'FAILED', 'CANCELLED']),
    url: z.string().optional(),
    size: z.number().optional()
});

const ProviderResponseSchema = z.object({
    report_status: z.enum(['DOES_NOT_EXIST', 'FINISHED', 'IN_PROGRESS', 'EXPIRED', 'FAILED', 'CANCELLED']),
    url: z.string().nullable().optional(),
    size: z.number().nullable().optional()
});

const action = createAction({
    description: 'Get the async ad account analytics report previously requested.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#operation/analytics/get_report
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/reports`,
            params: {
                token: input.token
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            report_status: providerResponse.report_status,
            ...(providerResponse.url != null && { url: providerResponse.url }),
            ...(providerResponse.size != null && { size: providerResponse.size })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
