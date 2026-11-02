import { z } from 'zod';
import { createTool } from 'nango';

const InputSchema = z
    .object({
        administrationId: z.string().regex(/^\d+$/).describe('Owning administration.'),
        financialMutationId: z.string().regex(/^\d+$/).describe('Source mutation to book.'),
        amountBase: z
            .string()
            .regex(/^-?[0-9]+(\.[0-9]+)?$/)
            .describe('Exact base-currency amount: positive for outgoing money, negative for incoming refunds.'),
        description: z.string().optional().describe('Description for the created booking; optional and sent literally, including empty text.'),
        projectId: z.string().regex(/^\d+$/).optional().describe('Optional project associated with the booking.')
    })
    .describe('Booking input that creates a new purchase invoice from an existing financial mutation.');

const OutputSchema = z
    .object({
        id: z.string().describe('Financial mutation ID returned after creation and linking, not the new document ID.'),
        state: z.string().optional().describe('Processing state after the booking.'),
        amountOpen: z.string().optional().describe('Exact decimal remaining open amount.')
    })
    .describe('Mutation acknowledgement returned after the new purchase invoice was created and linked.');

const FinancialMutationResponseSchema = z.object({
    id: z.union([z.string(), z.number()]),
    state: z.string().optional(),
    amount_open: z.string().optional()
});

const HttpErrorSchema = z.object({
    response: z.object({
        status: z.number(),
        data: z.unknown()
    })
});

const ErrorBodySchema = z.object({
    error: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
    symbolic: z.record(z.string(), z.unknown()).optional()
});

function providerErrorDetail(data: unknown): string | undefined {
    const body = ErrorBodySchema.safeParse(data);
    if (!body.success) {
        return undefined;
    }
    const parts: string[] = [];
    if (body.data.error !== undefined) {
        parts.push(typeof body.data.error === 'string' ? body.data.error : JSON.stringify(body.data.error));
    }
    if (body.data.symbolic !== undefined) {
        parts.push(JSON.stringify(body.data.symbolic));
    }
    return parts.length > 0 ? parts.join(' ') : undefined;
}

function publicError(code: string, message: string, data: unknown): Error {
    const detail = providerErrorDetail(data);
    return new Error(detail === undefined ? `${code}: ${message}` : `${code}: ${message} Provider message: ${detail}`);
}

function toPublicError(error: unknown): unknown {
    const httpError = HttpErrorSchema.safeParse(error);
    if (!httpError.success) {
        return error;
    }
    const { status, data } = httpError.data.response;
    if (status === 401 || status === 403) {
        return publicError('permission_denied', 'Bank or administration access is missing. Ask an administrator for bank access.', data);
    }
    if (status === 404) {
        return publicError('not_found', 'Mutation or referenced project is unavailable. Verify the IDs in the selected administration.', data);
    }
    if (status === 400 || status === 422) {
        const detail = providerErrorDetail(data);
        if (status === 400 && detail !== undefined && /settlement/i.test(detail)) {
            return publicError(
                'invalid_settlement_state',
                'Mutation is not settled, authorised or pending. Inspect `get-financial-mutation` and wait for an eligible state or choose another transaction.',
                data
            );
        }
        return publicError(
            'validation_failed',
            'Moneybird rejects amount, sign, project or accounting state. Correct the input and resolve accounting restrictions.',
            data
        );
    }
    return error;
}

/**
 * @tags: [write, destructive]
 * @tagReason: Books the financial mutation and creates a new purchase invoice record in Moneybird; the booking changes accounting state and each successful call creates another record, which this tool cannot undo.
 * @pitfalls: The token needs the documents scope in addition to bank or Moneybird rejects the call. The mutation must be settled, authorised or pending. Every successful call creates a new purchase invoice, so repeating it duplicates the invoice. The returned id is the financial mutation's; the created invoice's id is not exposed.
 */
const tool = createTool({
    name: 'create-purchase-invoice-from-financial-mutation',
    description: 'Create a new purchase invoice through booking an existing financial mutation, rather than linking an already existing purchase invoice.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Inspect the mutation with `get-financial-mutation`. It must be settled, authorised or pending. Supply a positive base amount for an outgoing purchase, negative for money received back. Use `add-booking-to-financial-mutation` with bookingType=Document for an existing purchase invoice. This creates a new record; repeating can duplicate it.',
        requiredScopes: ['bank'],
        tags: { read_only_hint: 'false', destructive_hint: 'true', idempotent_hint: 'false' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        const response = await nango
            .patch({
                // https://developer.moneybird.com/api/financial-mutations (PATCH /{administration_id}/financial_mutations/{id}/link_booking{format})
                endpoint: `/${encodeURIComponent(input.administrationId)}/financial_mutations/${encodeURIComponent(input.financialMutationId)}/link_booking.json`,
                data: {
                    booking_type: 'NewPurchaseInvoice',
                    price_base: input.amountBase,
                    ...(input.description !== undefined && { description: input.description }),
                    ...(input.projectId !== undefined && { project_id: input.projectId })
                },
                retries: 3
            })
            .catch((error: unknown) => {
                throw toPublicError(error);
            });

        const parsed = FinancialMutationResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(
                'write_result_unknown: The result cannot be mapped after creation. Inspect the mutation and its linked payments before creating another purchase invoice.'
            );
        }

        const mutation = parsed.data;
        return {
            id: String(mutation.id),
            ...(mutation.state !== undefined && { state: mutation.state }),
            ...(mutation.amount_open !== undefined && { amountOpen: mutation.amount_open })
        };
    }
});

export default tool;
