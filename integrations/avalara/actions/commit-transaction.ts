import type { TransactionCode, IdEntity, NangoAction, ProxyConfiguration } from '../../models';
import { transactionCodeSchema } from '../schema.zod.js';
import { getCompany } from '../helpers/get-company.js';
import type { AvalaraTransaction } from '../types';

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
export default async function runAction(nango: NangoAction, input: TransactionCode): Promise<IdEntity> {
    const parsedInput = transactionCodeSchema.safeParse(input);
    if (!parsedInput.success) {
        throw new nango.ActionError({
            message: 'Invalid input',
            errors: parsedInput.error
        });
    }

    const company = await getCompany(nango);

    const config: ProxyConfiguration = {
        // https://developer.avalara.com/api-reference/avatax/rest/v2/methods/Transactions/CommitTransaction/
        endpoint: `/companies/${company}/transactions/${input.transactionCode}/commit`,
        data: {
            commit: true
        },
        retries: 10
    };

    const response = await nango.post<AvalaraTransaction>(config);

    await nango.log('Received response', { response: response.data });

    return {
        id: response.data.id.toString()
    };
}
