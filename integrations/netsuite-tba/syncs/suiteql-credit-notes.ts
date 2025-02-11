import type { NangoSync, NetsuiteCreditNote, NetsuiteCreditNoteLine, ProxyConfiguration } from '../../models';
import { buildBaseQuery, retryOn401, createProxyConfig } from '../helpers/utils.js';
import { getAccount } from '../helpers/get-account.js';
import type { CreditMemoSuiteQLRow } from '../types';

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
        'TransactionLine.Description AS description',
        "TO_CHAR(Transaction.LastModifiedDate, 'YYYY-MM-DD HH24:MI:SS') AS lastModified"
    ];

    const joins = ['INNER JOIN TransactionLine ON (TransactionLine.Transaction = Transaction.ID)'];

    const filters = ["Transaction.Type = 'CustCred'"];
    if (lastSyncDate) {
        filters.push(`Transaction.LastModifiedDate >= TO_TIMESTAMP('${lastSyncDate}', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`);
    }

    const query = await buildBaseQuery({
        model: 'Transaction',
        fields,
        joins,
        filters,
        orderBy: 'Transaction.ID, TransactionLine.ID'
    });

    const proxyConfig: ProxyConfiguration = createProxyConfig(accountId, query);

    const allRows: CreditMemoSuiteQLRow[] = [];
    // eslint-disable-next-line @nangohq/custom-integrations-linting/no-try-catch-unless-explicitly-allowed
    try {
        for await (const page of retryOn401(() => nango.paginate<CreditMemoSuiteQLRow>(proxyConfig), MAX_RETRIES, nango)) {
            allRows.push(...page);
        }
    } catch (error: any) {
        await nango.log(`Error retrieving credit memo data: ${error.message}`, { level: 'error' });
        throw error;
    }

    await nango.log(`Fetched ${allRows.length} credit memo line-level rows via SuiteQL.`, {
        level: 'info'
    });

    // Group rows by their internalId
    const rowsByMemoId: Record<string, CreditMemoSuiteQLRow[]> = {};

    for (const row of allRows) {
        if (!row.internalid) {
            continue;
        }

        const internalId = row.internalid;

        if (!rowsByMemoId[internalId]) {
            rowsByMemoId[internalId] = [];
        }
        rowsByMemoId[internalId].push(row);
    }

    const creditNotes: NetsuiteCreditNote[] = [];

    for (const memoId of Object.keys(rowsByMemoId)) {
        const rows = rowsByMemoId[memoId];
        if (!rows || rows.length === 0) {
            continue;
        }

        const firstRow = rows[0];
        if (!firstRow) {
            continue;
        }

        const mappedCreditNote: NetsuiteCreditNote = {
            id: memoId,
            customerId: firstRow.entityid || '',
            currency: firstRow.currency || '',
            description: firstRow.memo || null,
            createdAt: firstRow.trandate || '',
            total: firstRow.total ? Number(firstRow.total) : 0,
            status: firstRow.status || '',
            lines: []
        };

        mappedCreditNote.lines = rows.map((r) => {
            const line: NetsuiteCreditNoteLine = {
                itemId: r.itemid || '',
                quantity: r.quantity ? Number(r.quantity) : 0,
                amount: r.amount ? Number(r.amount) : 0,
                description: r.description || ''
            };
            return line;
        });

        creditNotes.push(mappedCreditNote);
    }

    if (creditNotes.length > 0) {
        await nango.batchSave<NetsuiteCreditNote>(creditNotes, 'NetsuiteCreditNote');
        await nango.log(`Saved ${creditNotes.length} credit memos to NetsuiteCreditNote`, {
            level: 'info'
        });
    }
}
