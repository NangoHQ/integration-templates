import type { NangoSync, Transfer } from '../../models';
import type { QuickBooksTransfer } from '../types';
import { paginate } from '../helpers/paginate.js';
import { toTransfer } from '../mappers/to-transfer.js';
import type { PaginationParams } from '../helpers/paginate';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: PaginationParams = {
        model: 'Transfer'
    };

    for await (const qTransfers of paginate<QuickBooksTransfer>(nango, config)) {
        const transfers = qTransfers.map(toTransfer);
        await nango.batchSave<Transfer>(transfers, 'Transfer');
    }
}
