import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    Id: z.string().describe('The unique identifier of the payment to update. Example: "123"'),
    SyncToken: z.string().describe('The current sync token of the payment for optimistic locking. Example: "0"'),
    TotalAmt: z.number().optional().describe('The total amount of the payment. Optional for sparse updates.'),
    CustomerRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional()
        .describe('Reference to the customer who made the payment. Optional for sparse updates.'),
    PaymentMethodRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional()
        .describe('Reference to the payment method used. Optional for sparse updates.'),
    DepositToAccountRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional()
        .describe('Reference to the account where the payment is deposited. Optional for sparse updates.'),
    PrivateNote: z.string().optional().describe('Private note about the payment. Optional for sparse updates.'),
    TxnDate: z.string().optional().describe('The transaction date in YYYY-MM-DD format. Optional for sparse updates.'),
    sparse: z.boolean().optional().describe('Whether to perform a sparse update (only update provided fields). Defaults to true if not provided.')
});

const ProviderPaymentSchema = z.object({
    Id: z.string(),
    SyncToken: z.string(),
    TotalAmt: z.number(),
    CustomerRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional(),
    PaymentMethodRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional(),
    DepositToAccountRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional(),
    PrivateNote: z.string().optional(),
    TxnDate: z.string().optional(),
    domain: z.string().optional(),
    MetaData: z
        .object({
            CreateTime: z.string().optional(),
            LastUpdatedTime: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    Id: z.string().describe('The unique identifier of the payment.'),
    SyncToken: z.string().describe('The new sync token after update.'),
    TotalAmt: z.number().describe('The total amount of the payment.'),
    CustomerRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional()
        .describe('Reference to the customer who made the payment.'),
    PaymentMethodRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional()
        .describe('Reference to the payment method used.'),
    DepositToAccountRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional()
        .describe('Reference to the account where the payment is deposited.'),
    PrivateNote: z.string().optional().describe('Private note about the payment.'),
    TxnDate: z.string().optional().describe('The transaction date in YYYY-MM-DD format.'),
    domain: z.string().optional().describe('The domain of the payment record.'),
    MetaData: z
        .object({
            CreateTime: z.string().optional(),
            LastUpdatedTime: z.string().optional()
        })
        .optional()
        .describe('Metadata about the payment record.')
});

async function getCompany(nango: Parameters<(typeof action)['exec']>[0]): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config['realmId'];
    if (!realmId || typeof realmId !== 'string') {
        throw new nango.ActionError({
            type: 'missing_realm_id',
            message: 'realmId not found in the connection configuration. Please reauthenticate to set the realmId.'
        });
    }
    return realmId;
}

function buildUpdatePayload(input: z.infer<typeof InputSchema>): Record<string, unknown> {
    const payload: Record<string, unknown> = {
        Id: input.Id,
        SyncToken: input.SyncToken,
        sparse: input.sparse !== undefined ? input.sparse : true
    };

    if (input.TotalAmt !== undefined) {
        payload['TotalAmt'] = input.TotalAmt;
    }
    if (input.CustomerRef !== undefined) {
        payload['CustomerRef'] = input.CustomerRef;
    }
    if (input.PaymentMethodRef !== undefined) {
        payload['PaymentMethodRef'] = input.PaymentMethodRef;
    }
    if (input.DepositToAccountRef !== undefined) {
        payload['DepositToAccountRef'] = input.DepositToAccountRef;
    }
    if (input.PrivateNote !== undefined) {
        payload['PrivateNote'] = input.PrivateNote;
    }
    if (input.TxnDate !== undefined) {
        payload['TxnDate'] = input.TxnDate;
    }

    return payload;
}

const action = createAction({
    description: 'Update a payment using its current SyncToken.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-payment',
        group: 'Payments'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const realmId = await getCompany(nango);

        const payload = buildUpdatePayload(input);

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/payment
        const response = await nango.post({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/payment`,
            data: payload,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from QuickBooks API'
            });
        }

        // Parse response with Zod to validate structure
        const responseSchema = z.object({
            Payment: z.unknown().optional()
        });
        const parsedResponse = responseSchema.parse(response.data);
        const paymentData = parsedResponse.Payment !== undefined ? parsedResponse.Payment : response.data;

        const providerPayment = ProviderPaymentSchema.parse(paymentData);

        return {
            Id: providerPayment.Id,
            SyncToken: providerPayment.SyncToken,
            TotalAmt: providerPayment.TotalAmt,
            ...(providerPayment.CustomerRef !== undefined && { CustomerRef: providerPayment.CustomerRef }),
            ...(providerPayment.PaymentMethodRef !== undefined && { PaymentMethodRef: providerPayment.PaymentMethodRef }),
            ...(providerPayment.DepositToAccountRef !== undefined && { DepositToAccountRef: providerPayment.DepositToAccountRef }),
            ...(providerPayment.PrivateNote !== undefined && { PrivateNote: providerPayment.PrivateNote }),
            ...(providerPayment.TxnDate !== undefined && { TxnDate: providerPayment.TxnDate }),
            ...(providerPayment.domain !== undefined && { domain: providerPayment.domain }),
            ...(providerPayment.MetaData !== undefined && { MetaData: providerPayment.MetaData })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
