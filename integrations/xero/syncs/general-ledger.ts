import type { NangoSync, GeneralLedger, LedgerLine, TrackingCategory, ProxyConfiguration } from '../../models';
import type { XeroJournal, XeroJournalLine, XeroTrackingCategory } from '../types';
import { parseDate } from '../utils.js';
import { getTenantId } from '../helpers/get-tenant-id.js';

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
            page: 1
        },
        paginate: {
            type: 'offset',
            offset_name_in_request: 'offset',
            response_path: 'Journals'
        },
        retries: 10
    };

    if (nango.lastSyncDate && config.headers) {
        config.headers['If-Modified-Since'] = nango.lastSyncDate.toISOString().replace(/\.\d{3}Z$/, ''); // Returns yyyy-mm-ddThh:mm:ss
    }

    for await (const journals of nango.paginate(config)) {
        const generalLedger = journals.map(mapXeroJournal);
        await nango.batchSave(generalLedger, 'GeneralLedger');
    }
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
