import { createAction } from "nango";
import { transactionCodeSchema } from '../schema.zod.js';
import { getCompany } from '../helpers/get-company.js';
import type { AvalaraTransaction } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { IdEntity, TransactionCode } from "../models.js";

/**
 * Executes the action to commit a transaction changing the status to 'Committed' in Avalara using the provided transactionCode.
 *
 * The function then sends a POST request to the Avalara API to commit a transaction and returns the transaction ID.
 * For detailed endpoint documentation, refer to:
 * https://developer.avalara.com/api-reference/avatax/rest/v2/methods/Transactions/CommitTransaction/
 * @param nango - The NangoAction instance used for logging and making API requests.
 * @param input - The input data of type AvalaraCommitVoidTransationInput that contains the details of the transaction to be created.
 * @returns A promise that resolves to an object containing the transaction ID in string format.
 */
const action = createAction({
    description: "Marks a transaction by changing its status to Committed",
    version: "2.0.0",

    endpoint: {
        method: "PUT",
        path: "/transactions",
        group: "Transactions"
    },

    input: TransactionCode,
    output: IdEntity,

    scopes: [
        "AccountAdmin",
        " AccountOperator",
        " AccountUser",
        " BatchServiceAdmin",
        " CompanyAdmin",
        " CompanyUser",
        " CSPTester",
        " ProStoresOperator",
        " SSTAdmin",
        " TechnicalSupportAdmin"
    ],

    exec: async (nango, input): Promise<IdEntity> => {
        await nango.zodValidateInput({ zodSchema: transactionCodeSchema, input });

        const company = await getCompany(nango);

        const config: ProxyConfiguration = {
            // https://developer.avalara.com/api-reference/avatax/rest/v2/methods/Transactions/CommitTransaction/
            endpoint: `/companies/${company}/transactions/${input.transactionCode}/commit`,
            data: {
                commit: true
            },
            retries: 3
        };

        const response = await nango.post<AvalaraTransaction>(config);

        await nango.log('Received response', { response: response.data });

        return {
            id: response.data.id.toString()
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
