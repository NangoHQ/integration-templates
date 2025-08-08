import { createAction } from 'nango';
import { transactionCodeSchema } from '../schema.zod.js';
import { getCompany } from '../helpers/get-company.js';
import type { AvalaraTransaction } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { IdEntity, TransactionCode } from '../models.js';

/**
 * Executes the action to void a transaction , cancelling the transation in Avalara using the provided transactionCode.
 *
 * The function then sends a POST request to the Avalara API to void a transaction and returns the transaction ID.
 * For detailed endpoint documentation, refer to:
 * https://developer.avalara.com/api-reference/avatax/rest/v2/methods/Transactions/VoidTransaction/
 * @param nango - The NangoAction instance used for logging and making API requests.
 * @param input - The input data of type AvalaraCommitVoidTransationInput that contains the details of the transaction to be created.
 * @returns A promise that resolves to an object containing the transaction ID in string format.
 */
const action = createAction({
    description: 'Voids the current transaction uniquely identified by the transactionCode',
    version: '2.0.0',

    endpoint: {
        method: 'DELETE',
        path: '/transactions',
        group: 'Transactions'
    },

    input: TransactionCode,
    output: IdEntity,

    scopes: [
        'AccountAdmin',
        ' AccountOperator',
        ' BatchServiceAdmin',
        ' CompanyAdmin',
        ' CSPTester',
        ' ProStoresOperator',
        ' SSTAdmin',
        ' TechnicalSupportAdmin'
    ],

    exec: async (nango, input): Promise<IdEntity> => {
        await nango.zodValidateInput({ zodSchema: transactionCodeSchema, input });

        await nango.log(`Voiding transaction on Avatax for transactionCode: ${input.transactionCode}`);

        const company = await getCompany(nango);

        const config: ProxyConfiguration = {
            // https://developer.avalara.com/api-reference/avatax/rest/v2/methods/Transactions/VoidTransaction/
            endpoint: `/companies/${company}/transactions/${input.transactionCode}/void`,
            data: {
                code: 'DocVoided'
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

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
