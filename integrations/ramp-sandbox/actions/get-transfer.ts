import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        transfer_id: z.string().describe('Unique identifier of the transfer to retrieve. Example: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"')
    })
    .describe('Input for retrieving a single transfer by ID.');

const AmountSchema = z.object({
    amount: z.number().describe('The amount of money in the smallest denomination of the currency (e.g. cents for USD).'),
    currency_code: z.string().describe('ISO 4217 currency code of the transfer amount. Example: "USD".'),
    minor_unit_conversion_rate: z
        .number()
        .optional()
        .describe('Conversion factor from the minor-unit amount to the actual currency value (e.g. 100 for USD). Absent when Ramp does not provide one.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the transfer.'),
        amount: AmountSchema.optional().describe('Amount transferred, expressed in the smallest currency unit (e.g. cents for USD).'),
        entity_id: z.string().optional().describe('Unique identifier of the business entity associated with the transfer.'),
        payment_id: z.string().optional().describe('Unique payment identifier for the transfer. Example: "S4HG58F4M9".'),
        bank_account_id: z
            .string()
            .optional()
            .describe('Unique identifier of the bank account used for this transfer payment. Absent when none is associated.'),
        status: z.string().optional().describe('Current status of the transfer (e.g. "COMPLETED", "INITIATED", "ACH_CONFIRMED").'),
        sync_status: z.string().describe('Accounting sync status of the transfer: "NOT_SYNC_READY", "SYNC_READY", or "SYNCED".'),
        created_at: z.string().optional().describe('Timestamp when the transfer was created, in ISO-8601 format.')
    })
    .describe('A single Ramp transfer payment.');

const ProviderCurrencyAmountSchema = z.object({
    amount: z.number(),
    currency_code: z.string(),
    minor_unit_conversion_rate: z.number().nullable()
});

const ProviderTransferSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    amount: ProviderCurrencyAmountSchema.optional(),
    bank_account_id: z.string().nullable(),
    payment_id: z.string().optional(),
    created_at: z.string().optional(),
    entity_id: z.string().optional(),
    sync_status: z.string()
});

/**
 * @tags: [read]
 * @tagReason: Retrieves a single existing transfer from the provider without creating or modifying any data.
 * @pitfalls: Reads may be served from a read replica, so a transfer created or updated moments ago can briefly appear stale or not yet exist; status reflects a multi-step ACH lifecycle with both in-flight and terminal values rather than a simple success flag.
 */
const action = createAction({
    description: 'Retrieve a single transfer by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['transfers:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.ramp.com/developer-api/v1/guides/transfers
            endpoint: `/developer/v1/transfers/${encodeURIComponent(input.transfer_id)}`,
            retries: 3
        });

        const transfer = ProviderTransferSchema.parse(response.data);

        return {
            id: transfer.id,
            ...(transfer.amount != null && {
                amount: {
                    amount: transfer.amount.amount,
                    currency_code: transfer.amount.currency_code,
                    ...(transfer.amount.minor_unit_conversion_rate != null && {
                        minor_unit_conversion_rate: transfer.amount.minor_unit_conversion_rate
                    })
                }
            }),
            ...(transfer.entity_id != null && { entity_id: transfer.entity_id }),
            ...(transfer.payment_id != null && { payment_id: transfer.payment_id }),
            ...(transfer.bank_account_id != null && { bank_account_id: transfer.bank_account_id }),
            ...(transfer.status != null && { status: transfer.status }),
            sync_status: transfer.sync_status,
            ...(transfer.created_at != null && { created_at: transfer.created_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
