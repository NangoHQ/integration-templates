import type { NangoSync, Purchase } from '../../models';
import type { QuickBooksPurchase } from '../types';
import { paginate } from '../helpers/paginate.js';
import { toPurchase } from '../mappers/to-purchase.js';
import type { PaginationParams } from '../helpers/paginate';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: PaginationParams = {
        model: 'Purchase'
    };

    for await (const qPurchases of paginate<QuickBooksPurchase>(nango, config)) {
        const purchases = qPurchases.map(toPurchase);
        await nango.batchSave<Purchase>(purchases, 'Purchase');
    }
}
