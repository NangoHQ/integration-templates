import type { NangoSync, Ticket, ProxyConfiguration } from '../../models';
import type { SalesforceTicket, CaseComment } from '../types';

export default async function fetchData(nango: NangoSync) {
    const query = buildQuery(nango.lastSyncDate);

    await fetchAndSaveTickets(nango, query);
}

function buildQuery(lastSyncDate?: Date): string {
    let baseQuery = `
        SELECT
        Id,
        CaseNumber,
        Subject,
        AccountId,
        Account.Name,
        ContactId,
        Contact.Name,
        OwnerId,
        Owner.Name,
        Priority,
        Status,
        Description,
        Type,
        CreatedDate,
        ClosedDate,
        Origin,
        IsClosed,
        IsEscalated,
        LastModifiedDate,
        (SELECT Id, CommentBody, CreatedDate, CreatedBy.Name FROM CaseComments)
        FROM Case
    `;

    if (lastSyncDate) {
        baseQuery += ` WHERE LastModifiedDate > ${lastSyncDate.toISOString()}`;
    }

    return baseQuery;
}

async function fetchAndSaveTickets(nango: NangoSync, query: string) {
    const endpoint = '/services/data/v60.0/query';

    const proxyConfig: ProxyConfiguration = {
        endpoint,
        retries: 10,
        params: { q: query },
        paginate: {
            type: 'link',
            response_path: 'records',
            link_path_in_response_body: 'nextRecordsUrl'
        }
    };

    for await (const records of nango.paginate(proxyConfig)) {
        const mappedRecords = mapTickets(records);

        await nango.batchSave(mappedRecords, 'Ticket');
    }
}

function mapTickets(records: SalesforceTicket[]): Ticket[] {
    return records.map((record: SalesforceTicket) => {
        const salesforceTicket: Ticket = {
            id: record.Id,
            case_number: record.CaseNumber,
            subject: record.Subject,
            account_id: record.AccountId,
            account_name: record.Account?.Name ?? null,
            contact_id: record.ContactId,
            contact_name: record.Contact?.Name ?? null,
            owner_id: record.OwnerId,
            owner_name: record.Owner.Name,
            priority: record.Priority,
            status: record.Status,
            description: record.Description,
            type: record.Type,
            created_date: new Date(record.CreatedDate).toISOString(),
            closed_date: record.ClosedDate ? new Date(record.ClosedDate).toISOString() : null,
            origin: record.Origin,
            is_closed: record.IsClosed,
            is_escalated: record.IsEscalated,
            conversation:
                record.CaseComments?.records.map((comment: CaseComment) => ({
                    id: comment.Id,
                    body: comment.CommentBody,
                    created_date: new Date(comment.CreatedDate).toISOString(),
                    created_by: comment.CreatedBy.Name
                })) || [],
            last_modified_date: new Date(record.LastModifiedDate).toISOString()
        };

        return salesforceTicket;
    });
}
