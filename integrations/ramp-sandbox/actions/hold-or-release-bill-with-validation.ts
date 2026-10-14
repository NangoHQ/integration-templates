import { z } from 'zod';
import { createAction } from 'nango';

const OperationSchema = z.enum(['hold', 'release']);

const InputSchema = z
    .object({
        bill_id: z.string().describe('Unique identifier of the bill to hold or release. Example: "93d8436a-1cc7-596b-ace0-7c69f5bcb5ce".'),
        operation: OperationSchema.describe('Which action to take: "hold" places a payment hold, "release" removes an existing hold.'),
        reason: z
            .string()
            .optional()
            .describe('Optional reason recorded when placing a hold. Ignored when operation is "release". Example: "Awaiting additional review".')
    })
    .describe('Input for placing or removing a payment hold on a bill.');

const ProviderBillSchema = z.object({
    id: z.string(),
    status: z.string(),
    status_summary: z.string()
});

const OutputSchema = z
    .object({
        bill_id: z.string().describe('Unique identifier of the bill that was held or released.'),
        operation: OperationSchema.describe('The operation that was performed: "hold" or "release".'),
        previous_status_summary: z.string().describe('The bill status_summary observed before the operation. Example: "WAITING_FOR_TRANSFER_MATCH".'),
        status_summary: z.string().describe('The bill status_summary returned after the operation. Example: "ON_HOLD".'),
        status: z.string().describe('The bill payment status returned after the operation: "OPEN" or "PAID".')
    })
    .describe('Result of the hold or release operation, including the bill status before and after.');

/**
 * @tags: [read, write, destructive]
 * @tagReason: Reads the bill's current status before changing it, then places or removes a payment hold; a hold blocks all payment rails and deschedules scheduled payments.
 * @pitfalls: A hold blocks all payment rails and deschedules any scheduled payment, and releasing only re-allows scheduling rather than recreating the descheduled payment; holds are refused for already-held or fully paid bills, and releases are refused unless the bill is on hold.
 */
const action = createAction({
    description: 'Place or remove a hold on a bill after validating that the status transition is allowed.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['bills:read', 'bills:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const billResponse = await nango.get({
            // Ramp API docs: https://docs.ramp.com/developer-api/v1/overview/introduction (OpenAPI: https://docs.ramp.com/openapi/developer-api.json)
            endpoint: `/developer/v1/bills/${encodeURIComponent(input.bill_id)}`,
            retries: 3
        });

        const bill = ProviderBillSchema.parse(billResponse.data);
        const isPaid = bill.status === 'PAID' || bill.status_summary === 'PAYMENT_COMPLETED';

        if (input.operation === 'hold') {
            if (bill.status_summary === 'ON_HOLD') {
                throw new nango.ActionError({
                    type: 'invalid_bill_state',
                    message: `Bill ${bill.id} is already on hold (status_summary "ON_HOLD"); there is nothing to hold.`,
                    bill_id: bill.id,
                    operation: input.operation,
                    current_status_summary: bill.status_summary
                });
            }

            if (isPaid) {
                throw new nango.ActionError({
                    type: 'invalid_bill_state',
                    message: `Bill ${bill.id} is already paid (status_summary "${bill.status_summary}"); a paid bill cannot be placed on hold.`,
                    bill_id: bill.id,
                    operation: input.operation,
                    current_status_summary: bill.status_summary
                });
            }
        } else if (bill.status_summary !== 'ON_HOLD') {
            throw new nango.ActionError({
                type: 'invalid_bill_state',
                message: `Bill ${bill.id} is not on hold (status_summary "${bill.status_summary}"); there is no hold to release.`,
                bill_id: bill.id,
                operation: input.operation,
                current_status_summary: bill.status_summary
            });
        }

        const billPath = `/developer/v1/bills/${encodeURIComponent(bill.id)}`;

        const mutationResponse =
            input.operation === 'hold'
                ? await nango.post({
                      // Ramp API docs: https://docs.ramp.com/developer-api/v1/overview/introduction (OpenAPI: https://docs.ramp.com/openapi/developer-api.json)
                      endpoint: `${billPath}/hold`,
                      data: {
                          ...(input.reason !== undefined && { reason: input.reason })
                      },
                      // Retrying is safe: re-applying an existing hold is rejected without duplicating any side effect.
                      retries: 3
                  })
                : await nango.post({
                      // Ramp API docs: https://docs.ramp.com/developer-api/v1/overview/introduction (OpenAPI: https://docs.ramp.com/openapi/developer-api.json)
                      endpoint: `${billPath}/release`,
                      // Retrying is safe: re-releasing an already-released bill is rejected without duplicating any side effect.
                      retries: 3
                  });

        const updated = ProviderBillSchema.parse(mutationResponse.data);

        return {
            bill_id: updated.id,
            operation: input.operation,
            previous_status_summary: bill.status_summary,
            status_summary: updated.status_summary,
            status: updated.status
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
