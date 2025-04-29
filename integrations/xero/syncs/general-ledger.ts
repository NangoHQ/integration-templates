import type { GeneralLedger, LedgerLine, NangoSync, ProxyConfiguration, TrackingCategory } from '../../models';
import { getTenantId } from '../helpers/get-tenant-id.js';
import type { XeroJournal, XeroJournalLine, XeroTrackingCategory } from '../types';
import { parseDate } from '../utils.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const tenant_id = await getTenantId(nango);

    const config: ProxyConfiguration = {
        // https://developer.xero.com/documentation/api/accounting/journals
        endpoint: 'api.xro/2.0/Journals',
        headers: {
            'xero-tenant-id': tenant_id,
            'If-Modified-Since': ''
        },
        params: {
            offset: 0
        },
        retries: 10
    };

    if (nango.lastSyncDate && config.headers) {
        config.headers['If-Modified-Since'] = nango.lastSyncDate.toISOString().replace(/\.\d{3}Z$/, ''); // Returns yyyy-mm-ddThh:mm:ss
    }

    let hasMoreRecords = true;
    let highestJournalNumber = 0;

    do {
        const response = await nango.get<{ Journals: XeroJournal[] }>(config);
        const journals = response.data.Journals;

        if (!journals || journals.length === 0) {
            hasMoreRecords = false;
            continue;
        }

        // Map and save the journals
        const generalLedger = journals.map(mapXeroJournal);
        await nango.batchSave<GeneralLedger>(generalLedger, 'GeneralLedger');

        // Find the highest journal number in the current batch
        const maxJournalNumber = Math.max(...journals.map((journal: XeroJournal) => journal.JournalNumber));

        if (maxJournalNumber <= highestJournalNumber) {
            hasMoreRecords = false;
            continue;
        }

        // Update the highest journal number and offset for next request
        highestJournalNumber = maxJournalNumber;
        if (config.params && typeof config.params === 'object') {
            config.params['offset'] = maxJournalNumber;
        }
    } while (hasMoreRecords);
}

function mapXeroJournal(xeroJournal: XeroJournal): GeneralLedger {
    return {
        id: xeroJournal.JournalID,
        date: xeroJournal.JournalDate ? parseDate(xeroJournal.JournalDate).toISOString() : null,
        number: xeroJournal.JournalNumber,
        reference: xeroJournal.Reference || null,
        sourceId: xeroJournal.SourceID || null,
        sourceType: xeroJournal.SourceType || null,
        createdDate: xeroJournal.CreatedDateUTC ? parseDate(xeroJournal.CreatedDateUTC).toISOString() : null,
        lines: xeroJournal.JournalLines.map(mapJournalLine)
    };
}

function mapJournalLine(journalLine: XeroJournalLine): LedgerLine {
    return {
        journalLineId: journalLine.JournalLineID,
        accountId: journalLine.AccountID,
        accountCode: journalLine.AccountCode,
        accountName: journalLine.AccountName,
        description: journalLine.Description,
        netAmount: journalLine.NetAmount,
        grossAmount: journalLine.GrossAmount,
        taxAmount: journalLine.TaxAmount,
        taxType: journalLine.TaxType,
        taxName: journalLine.TaxName,
        trackingCategories: journalLine.TrackingCategories.map(mapTrackingCategory)
    };
}

function mapTrackingCategory(trackingCategory: XeroTrackingCategory): TrackingCategory {
    return {
        name: trackingCategory.Name,
        option: trackingCategory.Option,
        trackingCategoryId: trackingCategory.TrackingCategoryID,
        trackingOptionId: trackingCategory.TrackingOptionID,
        options: trackingCategory.Options
    };
}
