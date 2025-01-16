import type { NangoSync, Bill } from '../../models';
import type { QuickBooksBill } from '../types';
import { paginate } from '../helpers/paginate.js';
import { toBill } from '../mappers/to-bill.js';
import type { PaginationParams } from '../helpers/paginate';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: PaginationParams = {
        model: 'Bill'
    };

    for await (const bills of paginate<QuickBooksBill>(nango, config)) {
        const mappedBills = bills.map(toBill);
        await nango.batchSave<Bill>(mappedBills, 'Bill');
    }
}
