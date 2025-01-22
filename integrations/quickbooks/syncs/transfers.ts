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
        const activeTransfers = qTransfers.filter((transfer) => transfer.status !== 'Deleted');
        const deletedTransfers = qTransfers.filter((transfer) => transfer.status === 'Deleted');

        // Process and save active transfers
        if (activeTransfers.length > 0) {
            const mappedActiveTransfers = activeTransfers.map(toTransfer);
            await nango.batchSave<Transfer>(mappedActiveTransfers, 'Transfer');
        }

        // Process deletions if this is not the first sync
        if (nango.lastSyncDate && deletedTransfers.length > 0) {
            const mappedDeletedTransfers = deletedTransfers.map((transfer) => ({
                id: transfer.Id
            }));
            await nango.batchDelete<Transfer>(mappedDeletedTransfers, 'Transfer');
        }
    }
}
