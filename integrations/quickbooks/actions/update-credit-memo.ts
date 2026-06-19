import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique identifier of the credit memo. Example: "123"'),
    syncToken: z.string().describe('The current sync token of the credit memo. Required for updates to prevent conflicts.'),
    customerRef: z
        .object({
            value: z.string().describe('Customer ID'),
            name: z.string().optional().describe('Customer name')
        })
        .optional()
        .describe('Customer reference. Required when creating; optional for updates only when not changing the customer.'),
    txnDate: z.string().optional().describe('Transaction date in YYYY-MM-DD format'),
    line: z
        .array(
            z.object({
                id: z.string().optional().describe('Line item ID for existing lines'),
                lineNum: z.number().optional().describe('Line number'),
                description: z.string().optional().describe('Line item description'),
                amount: z.number().describe('Line item amount'),
                detailType: z.string().describe('Line detail type. Example: "SalesItemLineDetail"'),
                salesItemLineDetail: z
                    .object({
                        itemRef: z.object({
                            value: z.string().describe('Item ID'),
                            name: z.string().optional().describe('Item name')
                        }),
                        unitPrice: z.number().optional().describe('Unit price'),
                        qty: z.number().optional().describe('Quantity'),
                        taxCodeRef: z
                            .object({
                                value: z.string().describe('Tax code ID')
                            })
                            .optional()
                    })
                    .optional()
            })
        )
        .optional()
        .describe('Line items for the credit memo'),
    totalAmt: z.number().optional().describe('Total amount of the credit memo'),
    applyTaxAfterDiscount: z.boolean().optional().describe('Whether to apply tax after discount'),
    privateNote: z.string().nullable().optional().describe('Private note for internal use'),
    customerMemo: z
        .object({
            value: z.string().describe('Customer-facing memo text')
        })
        .optional()
        .describe('Memo to be displayed to the customer'),
    billAddr: z
        .object({
            id: z.string().optional().describe('Address ID'),
            line1: z.string().optional().describe('Address line 1'),
            line2: z.string().optional().describe('Address line 2'),
            city: z.string().optional().describe('City'),
            country: z.string().optional().describe('Country'),
            countrySubDivisionCode: z.string().optional().describe('State or province code'),
            postalCode: z.string().optional().describe('Postal or ZIP code')
        })
        .optional()
        .describe('Billing address'),
    shipAddr: z
        .object({
            id: z.string().optional().describe('Address ID'),
            line1: z.string().optional().describe('Address line 1'),
            line2: z.string().optional().describe('Address line 2'),
            city: z.string().optional().describe('City'),
            country: z.string().optional().describe('Country'),
            countrySubDivisionCode: z.string().optional().describe('State or province code'),
            postalCode: z.string().optional().describe('Postal or ZIP code')
        })
        .optional()
        .describe('Shipping address'),
    classRef: z
        .object({
            value: z.string().describe('Class ID'),
            name: z.string().optional().describe('Class name')
        })
        .optional()
        .describe('Class reference'),
    salesTermRef: z
        .object({
            value: z.string().describe('Sales term ID'),
            name: z.string().optional().describe('Sales term name')
        })
        .optional()
        .describe('Sales term reference'),
    globalTaxCalculation: z.string().optional().describe('Global tax calculation type'),
    txnTaxDetail: z
        .object({
            txnTaxCodeRef: z
                .object({
                    value: z.string().describe('Transaction tax code ID')
                })
                .optional(),
            totalTax: z.number().optional().describe('Total tax amount'),
            taxLine: z
                .array(
                    z.object({
                        amount: z.number().describe('Tax line amount'),
                        detailType: z.string().describe('Tax detail type'),
                        taxLineDetail: z.object({
                            taxRateRef: z.object({
                                value: z.string().describe('Tax rate ID')
                            }),
                            percentBased: z.boolean().describe('Whether tax is percent-based'),
                            taxPercent: z.number().optional().describe('Tax percentage'),
                            netAmountTaxable: z.number().describe('Net amount subject to tax')
                        })
                    })
                )
                .optional()
        })
        .optional()
        .describe('Transaction tax details'),
    depositToAccountRef: z
        .object({
            value: z.string().describe('Account ID'),
            name: z.string().optional().describe('Account name')
        })
        .optional()
        .describe('Account to deposit refund to')
});

const MetaDataSchema = z.object({
    CreateTime: z.string(),
    LastUpdatedTime: z.string()
});

const ProviderResponseSchema = z.object({
    CreditMemo: z.object({
        Id: z.string(),
        SyncToken: z.string(),
        MetaData: MetaDataSchema
    })
});

const OutputSchema = z.object({
    id: z.string(),
    syncToken: z.string(),
    createdAt: z.string(),
    updatedAt: z.string()
});

async function getCompany(nango: { getConnection: () => Promise<{ connection_config?: Record<string, unknown> }> }): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config?.['realmId'];
    if (typeof realmId !== 'string') {
        throw new Error('realmId not found in the connection configuration. Please reauthenticate to set the realmId');
    }
    return realmId;
}

const action = createAction({
    description: 'Update a QuickBooks credit memo',
    version: '2.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const realmId = await getCompany(nango);

        // Build sparse update payload - only include fields that are provided
        const payload: Record<string, unknown> = {
            Id: input.id,
            SyncToken: input.syncToken,
            sparse: true
        };

        if (input.customerRef !== undefined) {
            payload['CustomerRef'] = {
                value: input.customerRef.value,
                ...(input.customerRef.name !== undefined && { name: input.customerRef.name })
            };
        }
        if (input.txnDate !== undefined) {
            payload['TxnDate'] = input.txnDate;
        }
        if (input.line !== undefined) {
            payload['Line'] = input.line.map((line) => {
                const linePayload: Record<string, unknown> = {
                    Amount: line.amount,
                    DetailType: line.detailType
                };
                if (line.id !== undefined) {
                    linePayload['Id'] = line.id;
                }
                if (line.lineNum !== undefined) {
                    linePayload['LineNum'] = line.lineNum;
                }
                if (line.description !== undefined) {
                    linePayload['Description'] = line.description;
                }
                if (line.salesItemLineDetail !== undefined) {
                    const detail: Record<string, unknown> = {};
                    if (line.salesItemLineDetail.itemRef !== undefined) {
                        detail['ItemRef'] = {
                            value: line.salesItemLineDetail.itemRef.value,
                            ...(line.salesItemLineDetail.itemRef.name !== undefined && { name: line.salesItemLineDetail.itemRef.name })
                        };
                    }
                    if (line.salesItemLineDetail.unitPrice !== undefined) {
                        detail['UnitPrice'] = line.salesItemLineDetail.unitPrice;
                    }
                    if (line.salesItemLineDetail.qty !== undefined) {
                        detail['Qty'] = line.salesItemLineDetail.qty;
                    }
                    if (line.salesItemLineDetail.taxCodeRef !== undefined) {
                        detail['TaxCodeRef'] = {
                            value: line.salesItemLineDetail.taxCodeRef.value
                        };
                    }
                    linePayload['SalesItemLineDetail'] = detail;
                }
                return linePayload;
            });
        }
        if (input.totalAmt !== undefined) {
            payload['TotalAmt'] = input.totalAmt;
        }
        if (input.applyTaxAfterDiscount !== undefined) {
            payload['ApplyTaxAfterDiscount'] = input.applyTaxAfterDiscount;
        }
        if (input.privateNote !== undefined) {
            payload['PrivateNote'] = input.privateNote;
        }
        if (input.customerMemo !== undefined) {
            payload['CustomerMemo'] = input.customerMemo;
        }
        if (input.billAddr !== undefined) {
            payload['BillAddr'] = {
                ...(input.billAddr.id !== undefined && { Id: input.billAddr.id }),
                ...(input.billAddr.line1 !== undefined && { Line1: input.billAddr.line1 }),
                ...(input.billAddr.line2 !== undefined && { Line2: input.billAddr.line2 }),
                ...(input.billAddr.city !== undefined && { City: input.billAddr.city }),
                ...(input.billAddr.country !== undefined && { Country: input.billAddr.country }),
                ...(input.billAddr.countrySubDivisionCode !== undefined && { CountrySubDivisionCode: input.billAddr.countrySubDivisionCode }),
                ...(input.billAddr.postalCode !== undefined && { PostalCode: input.billAddr.postalCode })
            };
        }
        if (input.shipAddr !== undefined) {
            payload['ShipAddr'] = {
                ...(input.shipAddr.id !== undefined && { Id: input.shipAddr.id }),
                ...(input.shipAddr.line1 !== undefined && { Line1: input.shipAddr.line1 }),
                ...(input.shipAddr.line2 !== undefined && { Line2: input.shipAddr.line2 }),
                ...(input.shipAddr.city !== undefined && { City: input.shipAddr.city }),
                ...(input.shipAddr.country !== undefined && { Country: input.shipAddr.country }),
                ...(input.shipAddr.countrySubDivisionCode !== undefined && { CountrySubDivisionCode: input.shipAddr.countrySubDivisionCode }),
                ...(input.shipAddr.postalCode !== undefined && { PostalCode: input.shipAddr.postalCode })
            };
        }
        if (input.classRef !== undefined) {
            payload['ClassRef'] = input.classRef;
        }
        if (input.salesTermRef !== undefined) {
            payload['SalesTermRef'] = input.salesTermRef;
        }
        if (input.globalTaxCalculation !== undefined) {
            payload['GlobalTaxCalculation'] = input.globalTaxCalculation;
        }
        if (input.txnTaxDetail !== undefined) {
            payload['TxnTaxDetail'] = {
                ...(input.txnTaxDetail.txnTaxCodeRef !== undefined && { TxnTaxCodeRef: { value: input.txnTaxDetail.txnTaxCodeRef.value } }),
                ...(input.txnTaxDetail.totalTax !== undefined && { TotalTax: input.txnTaxDetail.totalTax }),
                ...(input.txnTaxDetail.taxLine !== undefined && {
                    TaxLine: input.txnTaxDetail.taxLine.map((tl) => ({
                        Amount: tl.amount,
                        DetailType: tl.detailType,
                        TaxLineDetail: {
                            TaxRateRef: { value: tl.taxLineDetail.taxRateRef.value },
                            PercentBased: tl.taxLineDetail.percentBased,
                            ...(tl.taxLineDetail.taxPercent !== undefined && { TaxPercent: tl.taxLineDetail.taxPercent }),
                            NetAmountTaxable: tl.taxLineDetail.netAmountTaxable
                        }
                    }))
                })
            };
        }
        if (input.depositToAccountRef !== undefined) {
            payload['DepositToAccountRef'] = input.depositToAccountRef;
        }

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/creditmemo
        const response = await nango.proxy({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/creditmemo?minorversion=73`,
            method: 'POST',
            data: payload,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            id: parsed.CreditMemo.Id,
            syncToken: parsed.CreditMemo.SyncToken,
            createdAt: parsed.CreditMemo.MetaData.CreateTime,
            updatedAt: parsed.CreditMemo.MetaData.LastUpdatedTime
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
