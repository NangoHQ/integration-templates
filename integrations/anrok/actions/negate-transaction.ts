import { createAction } from 'nango';
import { errorToObject } from '../utils.js';

import { TransactionNegationActionResponse, Anonymous_anrok_action_negatetransaction_input } from '../models.js';

const action = createAction({
    description: 'Creates a negation in Anrok.',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/transactions/negate'
    },

    input: Anonymous_anrok_action_negatetransaction_input,
    output: TransactionNegationActionResponse,

    exec: async (nango, rawInput): Promise<TransactionNegationActionResponse> => {
        const response: TransactionNegationActionResponse = {
            succeeded: [],
            failed: []
        };
        const input = Array.isArray(rawInput) ? rawInput : [rawInput];

        for (const transaction of input) {
            const negation = {
                originalTransactionId: transaction.id,
                newTransactionId: transaction.voided_id
            };

            // @allowTryCatch
            try {
                await nango.post({
                    endpoint: `v1/seller/transactions/createNegation`,
                    data: negation,
                    retries: 3
                });
                const successTransaction = {
                    ...transaction
                };
                response.succeeded.push(successTransaction);
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

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
