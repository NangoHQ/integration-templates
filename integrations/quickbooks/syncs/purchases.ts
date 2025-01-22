import type { NangoSync, Purchase } from '../../models';
import type { QuickBooksPurchase } from '../types';
import { paginate } from '../helpers/paginate.js';
import { toPurchase } from '../mappers/to-purchase.js';
import type { PaginationParams } from '../helpers/paginate';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: PaginationParams = {
        model: 'Purchase'
    };

    // for await (const qPurchases of paginate<QuickBooksPurchase>(nango, config)) {
    //     const purchases = qPurchases.map(toPurchase);
    //     await nango.batchSave<Purchase>(purchases, 'Purchase');
    // }
    // let allPurchases: QuickBooksPurchase[] = [];

    // for await (const qPurchases of paginate<QuickBooksPurchase>(nango, config)) {
    //     allPurchases = [...allPurchases, ...qPurchases];
    // }

    // const mappedPurchases = allPurchases.map(toPurchase);

    // const activePurchases = mappedPurchases.filter((purchase) => !purchase.is_deleted);
    // const deletedPurchases = mappedPurchases.filter((purchase) => purchase.is_deleted);

    // if (activePurchases.length > 0) {
    //     await nango.batchSave<Purchase>(activePurchases, 'Purchase');
    // }
    // if (nango.lastSyncDate && deletedPurchases.length > 0) {
    //     await nango.batchDelete<Purchase>(deletedPurchases, 'Purchase');
    // }
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
            await nango.batchDelete<Purchase>(mappedDeletedPurchases, 'Purchase');
        }
    }
}
