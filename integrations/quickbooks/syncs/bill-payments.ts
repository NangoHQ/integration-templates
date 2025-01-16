import type { NangoSync, BillPayment } from '../../models';
import type { QuickBooksBillPayment } from '../types';
import { paginate } from '../helpers/paginate.js';
import { toBillPayment } from '../mappers/to-bill-payment.js';
import type { PaginationParams } from '../helpers/paginate';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: PaginationParams = {
        model: 'BillPayment'
    };

    for await (const qbillPayments of paginate<QuickBooksBillPayment>(nango, config)) {
        const billPayments = qbillPayments.map(toBillPayment);
        await nango.batchSave<BillPayment>(billPayments, 'BillPayment');
    }
}
