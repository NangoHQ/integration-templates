import { createAction } from "nango";
import { errorToObject } from '../utils.js';

import {
    TransactionDeletionActionResponse,
    Anonymous_anrok_action_voidtransaction_input,
} from "../models.js";

const action = createAction({
    description: "Voids a transaction in Anrok.",
    version: "0.0.1",

    endpoint: {
        method: "POST",
        path: "/transactions/void"
    },

    input: Anonymous_anrok_action_voidtransaction_input,
    output: TransactionDeletionActionResponse,

    exec: async (nango, rawInput): Promise<TransactionDeletionActionResponse> => {
        const response: TransactionDeletionActionResponse = {
            succeeded: [],
            failed: []
        };
        const input = Array.isArray(rawInput) ? rawInput : [rawInput];
        for (const transaction of input) {
            // @allowTryCatch
            try {
                await nango.post({
                    endpoint: `v1/seller/transactions/id:${transaction.id}/void`,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: {},
                    retries: 3
                });
                response.succeeded.push(transaction);
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
