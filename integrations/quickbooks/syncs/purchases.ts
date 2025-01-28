import type { NangoSync, Purchase, DeleteResponse } from '../../models';
import type { QuickBooksPurchase } from '../types';
import { paginate } from '../helpers/paginate.js';
import { toPurchase } from '../mappers/to-purchase.js';
import type { PaginationParams } from '../helpers/paginate';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: PaginationParams = {
        model: 'Purchase'
    };

    for await (const qPurchases of paginate<QuickBooksPurchase>(nango, config)) {
        const activePurchases = qPurchases.filter((purchase) => purchase.status !== 'Deleted');
        const deletedPurchases = qPurchases.filter((purchase) => purchase.status === 'Deleted');

        // Process and save active purchases
        if (activePurchases.length > 0) {
            const mappedActivePurchases = activePurchases.map(toPurchase);
            await nango.batchSave<Purchase>(mappedActivePurchases, 'Purchase');
        }

        // Process deletions if this is not the first sync
        if (nango.lastSyncDate && deletedPurchases.length > 0) {
            const mappedDeletedPurchases = deletedPurchases.map((purchase) => ({
                id: purchase.Id
            }));
            await nango.batchDelete<DeleteResponse>(mappedDeletedPurchases, 'Purchase');
        }
    }
}
