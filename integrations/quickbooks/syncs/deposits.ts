import type { NangoSync, Deposit, DeleteResponse } from '../../models';
import type { QuickBooksDeposit } from '../types';
import { paginate } from '../helpers/paginate.js';
import { toDeposit } from '../mappers/to-deposit.js';
import type { PaginationParams } from '../helpers/paginate';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: PaginationParams = {
        model: 'Deposit'
    };

    for await (const qDeposits of paginate<QuickBooksDeposit>(nango, config)) {
        const activeDeposits = qDeposits.filter((d) => d.status !== 'Deleted');
        const deletedDeposits = qDeposits.filter((d) => d.status === 'Deleted');

        if (activeDeposits.length > 0) {
            const mappedActiveDeposits = activeDeposits.map(toDeposit);
            await nango.batchSave<Deposit>(mappedActiveDeposits, 'Deposit');
            await nango.log(`Successfully saved ${activeDeposits.length} active deposits`);
        }

        if (nango.lastSyncDate && deletedDeposits.length > 0) {
            const mappedDeletedDeposits = deletedDeposits.map((deposit) => ({
                id: deposit.Id
            }));
            await nango.batchDelete<DeleteResponse>(mappedDeletedDeposits, 'Deposit');
            await nango.log(`Successfully processed ${deletedDeposits.length} deleted deposits`);
        }
    }
}
