import { z } from 'zod';
import { createAction } from 'nango';

const ApprovalHistorySchema = z.object({
    user_id: z.string().nullable().describe('Unique identifier of the acting user, or null when the action was system-generated.'),
    user_email: z.string().nullable().describe('Email address of the acting user, or null when it is unavailable.'),
    action_at: z.string().describe('ISO-8601 timestamp of when the approval action occurred. Example: "2026-10-14T10:18:07.190240+00:00".'),
    step_status: z.string().describe('Resulting status of the approval step. Example: "Approved".')
});

const NextApproverSchema = z.object({
    user_id: z.string().describe('Unique identifier of the user responsible for the next approval action.'),
    user_email: z.string().describe('Email address of the user responsible for the next approval action.')
});

const ApprovalSchema = z.object({
    entity_id: z.string().describe('Unique identifier of the bill, reimbursement, or transaction under approval.'),
    entity_type: z.enum(['bill', 'reimbursement', 'transaction']).describe('Type of the resource under approval.'),
    status: z.enum(['APPROVED', 'INITIALIZED', 'PENDING', 'REJECTED', 'TERMINATED']).describe('Current status of the approval chain. Example: "APPROVED".'),
    approval_history: z.array(ApprovalHistorySchema).describe('Actions recorded for the approval chain, in chronological order.'),
    next_approvers: z.array(NextApproverSchema).describe('Users responsible for the next approval action; empty when no action is pending.')
});

const InputSchema = z
    .object({
        entity_type: z
            .enum(['BILL', 'REIMBURSEMENT', 'TRANSACTION'])
            .describe('Type of the resources whose approval data to fetch. Must match the supplied entity_ids. Example: "BILL".'),
        entity_ids: z
            .array(z.string().uuid())
            .min(1)
            .describe('Unique identifiers of the resources under approval. Example: ["79e87b94-b823-46f4-aed4-d05d9fc33463"].'),
        page_size: z
            .number()
            .int()
            .min(2)
            .max(100)
            .optional()
            .describe('Number of approval records to return per page, between 2 and 100. Defaults to 20 when omitted.')
    })
    .describe('Input for listing the approval chain and history of a set of bills, reimbursements, or transactions.');

const OutputSchema = z
    .object({
        approvals: z.array(ApprovalSchema).describe('Approval chains for the requested resources.'),
        next: z.string().nullable().describe('URL of the next page of results, or null when there are no more results.')
    })
    .describe('Approval chains and pagination details for the requested resources.');

const ProviderApprovalHistorySchema = z.object({
    user_id: z.string().nullable(),
    user_email: z.string().nullable(),
    action_at: z.string(),
    step_status: z.string()
});

const ProviderNextApproverSchema = z.object({
    user_id: z.string(),
    user_email: z.string()
});

const ProviderApprovalSchema = z.object({
    entity_id: z.string(),
    entity_type: z.enum(['bill', 'reimbursement', 'transaction']),
    status: z.enum(['APPROVED', 'INITIALIZED', 'PENDING', 'REJECTED', 'TERMINATED']),
    approval_history: z.array(ProviderApprovalHistorySchema),
    next_approvers: z.array(ProviderNextApproverSchema)
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderApprovalSchema),
    page: z.object({
        next: z.string().nullable()
    })
});

/**
 * @tags: [read]
 * @tagReason: Reads approval chain and history for the requested bills, reimbursements, or transactions without modifying provider data.
 * @pitfalls: `entity_type` must match the supplied IDs or the response is empty, and supplying more IDs than `page_size` (default 20) returns partial results whose `next` link may drop part of the entity filter, so following it can miss approvals.
 */
const action = createAction({
    description: 'List the approval chain and history for a set of bills, reimbursements, or transactions.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const queryParams = [
            `entity_type=${encodeURIComponent(input.entity_type)}`,
            ...input.entity_ids.map((entityId) => `entity_ids=${encodeURIComponent(entityId)}`),
            ...(input.page_size !== undefined ? [`page_size=${encodeURIComponent(String(input.page_size))}`] : [])
        ].join('&');

        const response = await nango.get({
            // https://docs.ramp.com/openapi/developer-api.json (GET /developer/v1/approvals)
            endpoint: '/developer/v1/approvals',
            params: queryParams,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            approvals: parsed.data,
            next: parsed.page.next
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
