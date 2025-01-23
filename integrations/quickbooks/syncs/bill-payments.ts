import type { NangoSync, BillPayment, DeleteResponse } from '../../models';
import type { QuickBooksBillPayment } from '../types';
import { paginate } from '../helpers/paginate.js';
import { toBillPayment } from '../mappers/to-bill-payment.js';
import type { PaginationParams } from '../helpers/paginate';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: PaginationParams = {
        model: 'BillPayment'
    };

    for await (const qBillPayments of paginate<QuickBooksBillPayment>(nango, config)) {
        const activeBillPayments = qBillPayments.filter((payment) => !payment.PrivateNote?.includes('Voided') && payment.status !== 'Deleted');
        const deletedBillPayments = qBillPayments.filter((payment) => payment.PrivateNote?.includes('Voided') || payment.status === 'Deleted');

        if (activeBillPayments.length > 0) {
            const mappedActiveBillPayments = activeBillPayments.map(toBillPayment);
            await nango.batchSave<BillPayment>(mappedActiveBillPayments, 'BillPayment');
            await nango.log(`Successfully saved ${activeBillPayments.length}  bill payments`);
        }

        // Handle deleted or voided bill payments if this isn't the first sync
        if (nango.lastSyncDate && deletedBillPayments.length > 0) {
            const mappedDeletedBillPayments = deletedBillPayments.map((payment) => ({
                id: payment.Id
            }));
            await nango.batchDelete<DeleteResponse>(mappedDeletedBillPayments, 'BillPayment');
            await nango.log(`Successfully processed ${deletedBillPayments.length} bill payments`);
        }
    }
}
