import type { NangoSync, Deposit } from '../../models';
import type { QuickBooksDeposit } from '../types';
import { paginate } from '../helpers/paginate.js';
import { toDeposit } from '../mappers/to-deposit.js';
import type { PaginationParams } from '../helpers/paginate';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: PaginationParams = {
        model: 'Deposit'
    };

    for await (const qDeposits of paginate<QuickBooksDeposit>(nango, config)) {
        const deposits = qDeposits.map(toDeposit);
        await nango.batchSave<Deposit>(deposits, 'Deposit');
    }
}
