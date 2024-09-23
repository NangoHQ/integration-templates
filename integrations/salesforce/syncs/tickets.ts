import type { NangoSync, SalesforceTicket, ProxyConfiguration } from '../../models';

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
    const endpoint = '/services/data/v53.0/query';

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
        const mappedRecords = mapDeals(records);

        await nango.batchSave(mappedRecords, 'SalesforceTicket');
    }
}

function mapDeals(records: any[]): SalesforceTicket[] {
    return records.map((record: any) => {
        const salesforceTicket: SalesforceTicket = {
            id: record.Id as string,
            case_number: record.CaseNumber,
            subject: record.Subject,
            account_id: record.AccountId,
            account_name: record.Account?.Name || null,
            contact_id: record.ContactId,
            contact_name: record.Contact?.Name || null,
            owner_id: record.OwnerId,
            owner_name: record.Owner?.Name || null,
            priority: record.Priority,
            status: record.Status,
            description: record.Description,
            type: record.Type,
            created_date: record.CreatedDate,
            closed_date: record.ClosedDate,
            origin: record.Origin,
            is_closed: record.IsClosed,
            is_escalated: record.IsEscalated,
            conversation:
                record.CaseComments?.records.map((comment: any) => ({
                    id: comment.Id,
                    body: comment.CommentBody,
                    created_date: comment.CreatedDate,
                    created_by: comment.CreatedBy.Name
                })) || [],
            last_modified_date: record.LastModifiedDate
        };

        return salesforceTicket;
    });
}
