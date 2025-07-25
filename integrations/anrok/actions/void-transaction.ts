import type { NangoAction, TransactionToDelete, TransactionDeletionActionResponse } from '../../models.js';
import { errorToObject } from '../utils.js';

export default async function runAction(nango: NangoAction, rawInput: TransactionToDelete[]): Promise<TransactionDeletionActionResponse> {
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
