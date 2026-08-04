import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    start_month: z.string().describe('Start month in YYYY-MM format. Example: "2026-01"'),
    end_month: z.string().optional().describe('End month in YYYY-MM format. Example: "2026-01"'),
    include_org_details: z.boolean().optional().describe('Include usage summaries for each sub-organization.'),
    include_connected_accounts: z
        .boolean()
        .optional()
        .describe('Include accounts connected to the current account as partner customers in the Datadog partner network program.')
});

const UsageSummaryOrgSchema = z
    .object({
        id: z.string().optional(),
        name: z.string().optional(),
        public_id: z.string().optional(),
        account_name: z.string().optional(),
        account_public_id: z.string().optional()
    })
    .passthrough();

const UsageSummaryDateSchema = z
    .object({
        date: z.string().optional(),
        orgs: z.array(UsageSummaryOrgSchema).optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        usage: z.array(UsageSummaryDateSchema).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Get a summary of billable usage across all Datadog products for a given month range.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['usage_read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {
            start_month: input.start_month
        };

        if (input.end_month !== undefined) {
            params['end_month'] = input.end_month;
        }

        if (input.include_org_details !== undefined) {
            params['include_org_details'] = String(input.include_org_details);
        }

        if (input.include_connected_accounts !== undefined) {
            params['include_connected_accounts'] = String(input.include_connected_accounts);
        }

        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/usage-metering/#get-usage-across-your-account
            endpoint: 'v1/usage/summary',
            params: params,
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
