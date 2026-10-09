import { z } from 'zod';
import { createAction } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const InputSchema = z
    .object({
        bill_id: z.string().describe('Unique identifier of the bill to mark as open. Example: "260815000000117048"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            )
    })
    .describe('Identifies the bill to mark as open within a Zoho Inventory organization.');

const ProviderResponseSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional()
});

const OutputSchema = z
    .object({
        bill_id: z.string().describe('Unique identifier of the bill.'),
        status: z.string().describe('Bill status after the operation, always "open".'),
        already_open: z.boolean().describe('True when the bill was already open and no transition was performed.'),
        message: z.string().describe('Human-readable result message.')
    })
    .describe('Result of marking a bill as open.');

function getErrorResponseData(error: unknown): unknown {
    if (typeof error !== 'object' || error === null || !('response' in error)) {
        return undefined;
    }
    const response = error.response;
    if (typeof response !== 'object' || response === null || !('data' in response)) {
        return undefined;
    }
    return response.data;
}

/**
 * @tags: [write]
 * @tagReason: Marks a bill as open, mutating the bill's status on the provider.
 * @pitfalls: Zoho creates bills in open status, so the transition is usually a no-op and returns already_open=true instead of erroring; the provider's top-level status can still read "overdue" or "paid" for a bill that is open.
 */
const action = createAction({
    description: 'Transition a draft bill to open status.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.bills.CREATE', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const organizationId = await resolveOrganizationId(nango, input.organization_id);

        let payload: unknown;
        let callSucceeded = false;

        // @allowTryCatch: the live CLI dryrun throws on non-2xx responses while the test runner resolves with the same body; both shapes are normalized to a single payload here.
        try {
            // https://www.zoho.com/inventory/api/v1/bills/#mark-as-open
            const response = await nango.post<unknown>({
                endpoint: `/inventory/v1/bills/${encodeURIComponent(input.bill_id)}/status/open`,
                params: {
                    organization_id: organizationId
                },
                // Idempotent state transition: a retry after a lost response just returns "already open", which is handled as success.
                retries: 3
            });
            payload = response.data;
            callSucceeded = response.status < 400;
        } catch (error) {
            payload = getErrorResponseData(error);
        }

        const parsed = ProviderResponseSchema.safeParse(payload);
        const code = parsed.success ? parsed.data.code : undefined;
        const message = parsed.success && parsed.data.message != null ? parsed.data.message : undefined;

        // Zoho returns code 1049 when the bill is already open, which is the desired end state.
        if (code === 1049) {
            return {
                bill_id: input.bill_id,
                status: 'open',
                already_open: true,
                message: message != null ? message : 'The bill is already in open status.'
            };
        }

        if (callSucceeded && (code === undefined || code === 0)) {
            return {
                bill_id: input.bill_id,
                status: 'open',
                already_open: false,
                message: message != null ? message : 'The bill has been marked as open.'
            };
        }

        throw new nango.ActionError({
            type: 'provider_error',
            message: message != null ? message : 'The provider did not mark the bill as open.',
            ...(code !== undefined && { code }),
            bill_id: input.bill_id
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
