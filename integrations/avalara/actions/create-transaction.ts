import type { CreateTransaction, IdEntity, NangoAction, ProxyConfiguration } from '../../models';
import { toTransaction } from '../mappers/to-transaction.js';
import type { AvalaraTransaction } from '../types';

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
export default async function runAction(nango: NangoAction, input: CreateTransaction): Promise<IdEntity> {
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
