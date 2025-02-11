import type { NangoSync, NetsuiteInvoice, NetsuiteInvoiceLine, ProxyConfiguration } from '../../models';
import { buildBaseQuery, retryOn401, createProxyConfig } from '../helpers/utils.js';
import { getAccount } from '../helpers/get-account.js';
import type { InvoiceSuiteQLRow } from '../types';

const MAX_RETRIES = 5;

export default async function fetchData(nango: NangoSync): Promise<void> {
    const { accountId } = await getAccount(nango);

    let lastSyncDate: string | undefined;
    if (nango.lastSyncDate) {
        lastSyncDate = nango.lastSyncDate.toISOString().split('.')[0] + 'Z';
    }

    const fields = [
        'Transaction.ID AS internalId',
        'Transaction.TranId AS docNumber',
        'Transaction.Entity AS entityId',
        'Transaction.Currency AS currency',
        'Transaction.Memo AS memo',
        'Transaction.TranDate AS tranDate',
        'Transaction.Total AS total',
        'Transaction.Status AS status',
        'TransactionLine.ID AS lineId',
        'TransactionLine.Item AS itemId',
        'TransactionLine.Quantity AS quantity',
        'TransactionLine.Amount AS amount',
        "TO_CHAR(Transaction.LastModifiedDate, 'YYYY-MM-DD HH24:MI:SS') AS lastModified"
    ];

    const joins = ['INNER JOIN TransactionLine ON TransactionLine.Transaction = Transaction.ID'];

    const filters = ["Transaction.Type = 'CustInvc'"];
    if (lastSyncDate) {
        filters.push(`Transaction.LastModifiedDate >= TO_TIMESTAMP('${lastSyncDate}', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`);
    }

    const query = buildBaseQuery({
        model: 'Transaction',
        fields,
        joins,
        filters,
        orderBy: 'Transaction.ID, TransactionLine.ID'
    });

    const proxyConfig: ProxyConfiguration = createProxyConfig(accountId, query);

    const allRows: InvoiceSuiteQLRow[] = [];
    // eslint-disable-next-line @nangohq/custom-integrations-linting/no-try-catch-unless-explicitly-allowed
    try {
        for await (const page of retryOn401(() => nango.paginate<InvoiceSuiteQLRow>(proxyConfig), MAX_RETRIES, nango)) {
            allRows.push(...page);
        }
    } catch (error: any) {
        await nango.log(`Error retrieving invoice data: ${error.message}`, { level: 'error' });
        throw error;
    }

    await nango.log(`Fetched ${allRows.length} invoice line-level rows via SuiteQL.`, {
        level: 'info'
    });

    // Group rows by their internalId
    const rowsByInvoiceId: Record<string, InvoiceSuiteQLRow[]> = {};

    for (const row of allRows) {
        if (!row.internalid) {
            continue;
        }

        const internalId = row.internalid;

        if (!rowsByInvoiceId[internalId]) {
            rowsByInvoiceId[internalId] = [];
        }
        rowsByInvoiceId[internalId].push(row);
    }

    const invoices: NetsuiteInvoice[] = [];

    for (const invoiceId of Object.keys(rowsByInvoiceId)) {
        const rows = rowsByInvoiceId[invoiceId];
        if (!rows || rows.length === 0) {
            continue;
        }

        const firstRow = rows[0];
        if (!firstRow) {
            continue;
        }

        const mappedInvoice: NetsuiteInvoice = {
            id: invoiceId,
            customerId: firstRow.entityid || '',
            currency: firstRow.currency || '',
            description: firstRow.memo || null,
            createdAt: firstRow.trandate || '',
            total: firstRow.total ? Number(firstRow.total) : 0,
            status: firstRow.status || '',
            lines: []
        };

        mappedInvoice.lines = rows.map((r) => {
            const line: NetsuiteInvoiceLine = {
                itemId: r.itemid || '',
                quantity: r.quantity ? Number(r.quantity) : 0,
                amount: r.amount ? Number(r.amount) : 0
            };
            return line;
        });

        invoices.push(mappedInvoice);
    }

    if (invoices.length > 0) {
        await nango.batchSave<NetsuiteInvoice>(invoices, 'NetsuiteInvoice');
        await nango.log(`Saved ${invoices.length} invoices to NetsuiteInvoice`, {
            level: 'info'
        });
    }
}
