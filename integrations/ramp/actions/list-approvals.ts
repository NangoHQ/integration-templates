import { z } from 'zod';
import { createAction } from 'nango';

const ApprovalHistorySchema = z.object({
    user_id: z.string().optional().describe('Unique identifier of the acting user; omitted when the action was system-generated.'),
    user_email: z.string().optional().describe('Email address of the acting user; omitted when it is unavailable.'),
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
            .max(100)
            .describe(
                'Unique identifiers of the resources under approval, at most 100 per call (split larger sets across calls). All matching approval chains are returned. Example: ["79e87b94-b823-46f4-aed4-d05d9fc33463"].'
            )
    })
    .describe('Input for listing the approval chain and history of a set of bills, reimbursements, or transactions.');

const OutputSchema = z
    .object({
        approvals: z.array(ApprovalSchema).describe('Approval chains for all of the requested resources.')
    })
    .describe('Approval chains for the requested resources.');

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

// Largest page size the endpoint accepts.
const MAX_PAGE_SIZE = 100;
// Each resource has at most one approval chain, so batches smaller than a page always fit on one page (Ramp reports a next link whenever a page is full).
const ENTITY_BATCH_SIZE = 50;

/**
 * @tags: [read]
 * @tagReason: Reads approval chain and history for the requested bills, reimbursements, or transactions without modifying provider data.
 * @pitfalls: `entity_type` must match the supplied IDs or the response is empty. Ramp's pagination for this endpoint is unusable (its `next` link keeps only one of the requested entity_ids and the `start` cursor returns HTTP 500), so the action requests the IDs in batches of at most 50 with page_size=100 and returns every approval chain in a single response; resources without an approval chain are simply absent. At most 100 entity_ids are accepted per call, which bounds the request count and keeps the aggregated output well below Nango's 2MB action-output limit.
 */
const action = createAction({
    description: 'List the approval chain and history for a set of bills, reimbursements, or transactions.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['approvals:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const fetchApprovals = async (entityIds: string[]): Promise<z.infer<typeof ProviderApprovalSchema>[]> => {
            const queryParams = [
                `entity_type=${encodeURIComponent(input.entity_type)}`,
                ...entityIds.map((entityId) => `entity_ids=${encodeURIComponent(entityId)}`),
                `page_size=${MAX_PAGE_SIZE}`
            ].join('&');

            const response = await nango.get({
                // https://docs.ramp.com/openapi/developer-api.json (GET /developer/v1/approvals)
                endpoint: '/developer/v1/approvals',
                params: queryParams,
                retries: 3
            });

            const parsed = ProviderResponseSchema.parse(response.data);
            if (parsed.page.next === null) {
                return parsed.data;
            }

            // More records than fit on one page. Ramp's next link drops entity_ids, so split the batch instead of following it.
            if (entityIds.length > 1) {
                const middle = Math.ceil(entityIds.length / 2);
                const first = await fetchApprovals(entityIds.slice(0, middle));
                const second = await fetchApprovals(entityIds.slice(middle));
                return [...first, ...second];
            }

            throw new nango.ActionError({
                type: 'pagination_unsupported',
                message: `Ramp returned more than ${MAX_PAGE_SIZE} approval records for ${input.entity_type} ${entityIds[0]}, which cannot be paginated reliably.`,
                entity_id: entityIds[0]
            });
        };

        const approvals: z.infer<typeof ProviderApprovalSchema>[] = [];
        for (let i = 0; i < input.entity_ids.length; i += ENTITY_BATCH_SIZE) {
            approvals.push(...(await fetchApprovals(input.entity_ids.slice(i, i + ENTITY_BATCH_SIZE))));
        }

        return {
            approvals: approvals.map((approval) => ({
                entity_id: approval.entity_id,
                entity_type: approval.entity_type,
                status: approval.status,
                approval_history: approval.approval_history.map((entry) => ({
                    action_at: entry.action_at,
                    step_status: entry.step_status,
                    ...(entry.user_id != null && { user_id: entry.user_id }),
                    ...(entry.user_email != null && { user_email: entry.user_email })
                })),
                next_approvers: approval.next_approvers
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
