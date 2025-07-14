import type { NangoSync, Bill, DeleteResponse } from '../../models.js';
import type { QuickBooksBill } from '../types.js';
import { paginate } from '../helpers/paginate.js';
import { toBill } from '../mappers/to-bill.js';
import type { PaginationParams } from '../helpers/paginate.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: PaginationParams = {
        model: 'Bill'
    };

    for await (const qBills of paginate<QuickBooksBill>(nango, config)) {
        // Split active and deleted bills
        const activeBills = qBills.filter((bill) => bill.status !== 'Deleted');
        const deletedBills = qBills.filter((bill) => bill.status === 'Deleted');

        if (activeBills.length > 0) {
            const mappedActiveBills = activeBills.map(toBill);
            await nango.batchSave<Bill>(mappedActiveBills, 'Bill');
            await nango.log(`Successfully saved ${activeBills.length} active bills`);
        }

        // Handle deleted bills if this isn't the first sync
        if (nango.lastSyncDate && deletedBills.length > 0) {
            const mappedDeletedBills = deletedBills.map((bill) => ({
                id: bill.Id
            }));
            await nango.batchDelete<DeleteResponse>(mappedDeletedBills, 'Bill');
            await nango.log(`Successfully processed ${deletedBills.length} deleted bills`);
        }
    }
}
