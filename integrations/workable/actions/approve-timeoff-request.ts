import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    key: z.string().describe('Approval key from the pending_approvals array. Example: "d38d7"'),
    state: z.enum(['approved', 'rejected']).describe('New approval state.'),
    approver_id: z.string().describe('Approver id from the request\'s pending_approvals[]. Example: "57d87371-d64b-4caa-99d8-442c8d4ef5bc"'),
    member_id: z.string().describe('Member id for account tokens. Example: "1f395d"')
});

const ProviderPendingApprovalSchema = z.object({
    id: z.string(),
    approver_id: z.string()
});

const ProviderTimeoffRequestSchema = z.object({
    id: z.string(),
    employee_id: z.string(),
    from_date: z.string(),
    to_date: z.string(),
    formatted_period: z.string().optional(),
    state: z.string(),
    requesting_total: z.number().optional(),
    timeoff_tracking_unit: z.string().optional(),
    half_days: z.array(z.unknown()).optional(),
    updated_by: z.string().optional(),
    category_name: z.string().optional(),
    pending_approvals: z.array(ProviderPendingApprovalSchema).optional()
});

const OutputSchema = ProviderTimeoffRequestSchema;

const action = createAction({
    description: 'Approve or reject a pending time-off request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['w_timeoff'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://workable.readme.io/reference/timeoffapprovals
        const response = await nango.patch({
            endpoint: `/spi/v3/timeoff/approvals/${encodeURIComponent(input.key)}`,
            data: {
                state: input.state,
                approver_id: input.approver_id,
                member_id: input.member_id
            },
            retries: 10
        });

        const providerRequest = ProviderTimeoffRequestSchema.parse(response.data);

        return providerRequest;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
