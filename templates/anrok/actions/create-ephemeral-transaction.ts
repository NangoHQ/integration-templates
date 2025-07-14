import { createAction } from "nango";

import type { AnrokResponse } from '../types.js';
import { mapFees } from '../mappers/fees.js';
import { errorToObject } from '../utils.js';

import type { AnrokTransactionData, SuccessTransaction, TransactionFee } from "../models.js";
import { TransactionActionResponse, Transaction } from "../models.js";

const action = createAction({
    description: "Creates an ephemeral transaction in Anrok.",
    version: "0.0.1",

    endpoint: {
        method: "POST",
        path: "/ephmeral-transactions"
    },

    input: Transaction,
    output: TransactionActionResponse,

    exec: async (nango, rawInput): Promise<TransactionActionResponse> => {
        const response: TransactionActionResponse = {
            succeeded: [],
            failed: []
        };

        const input = Array.isArray(rawInput) ? rawInput : [rawInput];

        for (const transaction of input) {
            const anrokTransaction: AnrokTransactionData = {
                accountingDate: transaction.issuing_date,
                currencyCode: transaction.currency,
                customerId: transaction.contact.external_id,
                customerName: transaction.contact.name,
                customerAddress: {
                    line1: transaction.contact.address_line_1,
                    city: transaction.contact.city,
                    postalCode: transaction.contact.zip,
                    country: transaction.contact.country
                },
                lineItems: transaction.fees.map((fee: TransactionFee) => ({
                    id: fee.item_id,
                    productExternalId: fee.item_code || '',
                    amount: fee.amount_cents || 0
                }))
            };

            if (transaction.contact.taxable && transaction.contact.tax_number) {
                anrokTransaction.customerTaxIds = [
                    {
                        type: 'genericVatNumber',
                        value: transaction.contact.tax_number
                    }
                ];
            }

            // @allowTryCatch
            try {
                const res = await nango.post<AnrokResponse>({
                    endpoint: 'v1/seller/transactions/createEphemeral',
                    data: anrokTransaction,
                    retries: 3
                });
                const { preTaxAmount, taxAmountToCollect, lineItems } = res.data;

                const transactionResponse: SuccessTransaction = {
                    ...transaction,
                    sub_total_excluding_taxes: Number(preTaxAmount),
                    taxes_amount_cents: taxAmountToCollect,
                    fees: mapFees(transaction.fees, lineItems)
                };

                response.succeeded.push(transactionResponse);
            } catch (err) {
                response.failed.push({
                    ...transaction,
                    validation_errors: errorToObject(err)
                });
            }
        }
        return response;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
