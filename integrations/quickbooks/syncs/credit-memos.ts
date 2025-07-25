import type { NangoSync, CreditMemo, DeleteResponse } from '../../models.js';
import type { QuickBooksCreditMemo } from '../types.js';
import { paginate } from '../helpers/paginate.js';
import { toCreditMemo } from '../mappers/to-credit-memo.js';
import type { PaginationParams } from '../helpers/paginate.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: PaginationParams = {
        model: 'CreditMemo'
    };

    for await (const qCreditMemos of paginate<QuickBooksCreditMemo>(nango, config)) {
        const activeCreditMemos = qCreditMemos.filter((memo) => memo.status !== 'Deleted');
        const deletedCreditMemos = qCreditMemos.filter((memo) => memo.status === 'Deleted');

        if (activeCreditMemos.length > 0) {
            const mappedActiveCreditMemos = activeCreditMemos.map(toCreditMemo);
            await nango.batchSave<CreditMemo>(mappedActiveCreditMemos, 'CreditMemo');
            await nango.log(`Successfully saved ${activeCreditMemos.length} active credit memos`);
        }

        if (deletedCreditMemos.length > 0 && nango.lastSyncDate) {
            const mappedDeletedCreditMemos = deletedCreditMemos.map((memo) => ({
                id: memo.Id
            }));
            await nango.batchDelete<DeleteResponse>(mappedDeletedCreditMemos, 'CreditMemo');
            await nango.log(`Successfully processed ${deletedCreditMemos.length} deleted credit memos`);
        }
    }
}
