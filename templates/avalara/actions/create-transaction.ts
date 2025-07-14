import { createAction } from "nango";
import { toTransaction } from '../mappers/to-transaction.js';
import type { AvalaraTransaction } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { IdEntity, CreateTransaction } from "../models.js";

/**
 * Executes the action to create a transaction in Avalara using the provided input data.
 *
 * This function converts the input data into a format suitable for Avalara using the `toTransaction` mapper.
 * The function then sends a POST request to the Avalara API to create the transaction and returns the transaction ID.
 * For detailed endpoint documentation, refer to:
 * https://developer.avalara.com/api-reference/avatax/rest/v2/methods/Transactions/CreateTransaction/
 * @param nango - The NangoAction instance used for logging and making API requests.
 * @param input - The input data of type AvalaraCreateTransationInput that contains the details of the transaction to be created.
 * @returns A promise that resolves to an object containing the transaction ID in string format.
 */
const action = createAction({
    description: "Creates a new transaction",
    version: "1.0.0",

    endpoint: {
        method: "POST",
        path: "/transactions",
        group: "Transactions"
    },

    input: CreateTransaction,
    output: IdEntity,

    scopes: [
        "AccountAdmin",
        " AccountOperator",
        " AccountUser",
        " BatchServiceAdmin",
        " CompanyAdmin",
        " CompanyUser",
        " CSPTester",
        " SSTAdmin",
        " TechnicalSupportAdmin",
        " TechnicalSupportUser"
    ],

    exec: async (nango, input): Promise<IdEntity> => {
        const body = toTransaction(nango, input);

        const config: ProxyConfiguration = {
            // https://developer.avalara.com/api-reference/avatax/rest/v2/methods/Transactions/CreateTransaction/
            endpoint: `/transactions/create`,
            data: body,
            retries: 3
        };

        const response = await nango.post<AvalaraTransaction>(config);

        return {
            id: response.data.id.toString()
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
