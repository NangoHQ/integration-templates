import type { NangoSync, CreditMemo } from '../../models';
import type { QuickBooksCreditMemo } from '../types';
import { paginate } from '../helpers/paginate.js';
import { toCreditMemo } from '../mappers/to-credit-memo.js';
import type { PaginationParams } from '../helpers/paginate';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: PaginationParams = {
        model: 'CreditMemo'
    };

    for await (const qCreditMemos of paginate<QuickBooksCreditMemo>(nango, config)) {
        const creditMemos = qCreditMemos.map(toCreditMemo);
        await nango.batchSave<CreditMemo>(creditMemos, 'CreditMemo');
    }
}
