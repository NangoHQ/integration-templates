import { createSync } from 'nango';
import { z } from 'zod';

// Conversation context from related records
const ConversationItemSchema = z.object({
    id: z.string(),
    type: z.enum(['CaseComment', 'FeedItem', 'EmailMessage']),
    created_date: z.string(),
    created_by: z.string().optional(),
    body: z.string().optional()
});

const TicketSchema = z.object({
    id: z.string(),
    case_number: z.string(),
    subject: z.string().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    origin: z.string().optional(),
    reason: z.string().optional(),
    owner_id: z.string().optional(),
    account_id: z.string().optional(),
    contact_id: z.string().optional(),
    created_date: z.string(),
    last_modified_date: z.string(),
    is_deleted: z.boolean().optional(),
    conversation: z.array(ConversationItemSchema).optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const SalesforceQueryResponseSchema = z.object({
    records: z.array(
        z.object({
            Id: z.string(),
            CaseNumber: z.string(),
            Subject: z.string().nullable().optional(),
            Description: z.string().nullable().optional(),
            Status: z.string().nullable().optional(),
            Priority: z.string().nullable().optional(),
            Origin: z.string().nullable().optional(),
            Reason: z.string().nullable().optional(),
            OwnerId: z.string().nullable().optional(),
            AccountId: z.string().nullable().optional(),
            ContactId: z.string().nullable().optional(),
            CreatedDate: z.string(),
            LastModifiedDate: z.string()
        })
    ),
    done: z.boolean(),
    nextRecordsUrl: z.string().optional()
});

const sync = createSync({
    description: 'Sync Salesforce case tickets with core fields and related conversation context.',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Ticket: TicketSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/tickets'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint ? checkpoint['updated_after'] : '';

        // Get deleted records first if we have a checkpoint
        // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_queryall.htm
        if (updatedAfter) {
            const deletedQuery = `SELECT Id, LastModifiedDate FROM Case WHERE IsDeleted = true AND LastModifiedDate >= ${updatedAfter}`;
            const deletedResponse = await nango.get({
                endpoint: '/services/data/v59.0/queryAll',
                params: {
                    q: deletedQuery
                },
                retries: 3
            });

            const deletedRecords = z
                .object({
                    records: z.array(
                        z.object({
                            Id: z.string()
                        })
                    )
                })
                .parse(deletedResponse.data);

            if (deletedRecords.records.length > 0) {
                await nango.batchDelete(
                    deletedRecords.records.map((record) => ({ id: record.Id })),
                    'Ticket'
                );
            }
        }

        // Build SOQL query for Case records
        const baseQuery = `SELECT Id, CaseNumber, Subject, Description, Status, Priority, Origin, Reason, OwnerId, AccountId, ContactId, CreatedDate, LastModifiedDate FROM Case`;
        const whereClause = updatedAfter ? ` WHERE LastModifiedDate >= ${updatedAfter}` : '';
        const orderClause = ' ORDER BY LastModifiedDate ASC';
        const soqlQuery = baseQuery + whereClause + orderClause;

        // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
        let nextRecordsUrl: string | undefined = undefined;
        let pageCount = 0;
        const maxPages = 100;

        while (pageCount < maxPages) {
            let response;
            if (nextRecordsUrl) {
                response = await nango.get({
                    endpoint: nextRecordsUrl,
                    retries: 3
                });
            } else {
                response = await nango.get({
                    endpoint: '/services/data/v59.0/query',
                    params: {
                        q: soqlQuery
                    },
                    retries: 3
                });
            }

            const queryResult = SalesforceQueryResponseSchema.parse(response.data);
            const cases = queryResult.records;

            if (cases.length === 0) {
                break;
            }

            // Hydrate conversation data for each case sequentially to avoid rate limits
            const tickets: z.infer<typeof TicketSchema>[] = [];
            for (const caseRecord of cases) {
                const conversation: z.infer<typeof ConversationItemSchema>[] = [];

                // Fetch CaseComments
                // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
                const caseCommentQuery = `SELECT Id, CreatedDate, CreatedById, CommentBody FROM CaseComment WHERE ParentId = '${encodeURIComponent(caseRecord.Id)}' ORDER BY CreatedDate ASC`;
                // @allowTryCatch CaseComment objects may not be accessible or available in all Salesforce orgs; graceful degradation preserves sync.
                try {
                    const caseCommentResponse = await nango.get({
                        endpoint: '/services/data/v59.0/query',
                        params: {
                            q: caseCommentQuery
                        },
                        retries: 3
                    });

                    const caseComments = z
                        .object({
                            records: z.array(
                                z.object({
                                    Id: z.string(),
                                    CreatedDate: z.string(),
                                    CreatedById: z.string().nullable().optional(),
                                    CommentBody: z.string().nullable().optional()
                                })
                            )
                        })
                        .parse(caseCommentResponse.data);

                    for (const comment of caseComments.records) {
                        conversation.push({
                            id: comment.Id,
                            type: 'CaseComment',
                            created_date: comment.CreatedDate,
                            created_by: comment.CreatedById ?? undefined,
                            body: comment.CommentBody ?? undefined
                        });
                    }
                } catch {
                    // Case comments may not be available, continue without them
                }

                // Fetch FeedItems for case feed
                const feedQuery = `SELECT Id, CreatedDate, CreatedById, Body FROM FeedItem WHERE ParentId = '${encodeURIComponent(caseRecord.Id)}' ORDER BY CreatedDate ASC`;
                // @allowTryCatch FeedItem objects may not be accessible or available in all Salesforce orgs; graceful degradation preserves sync.
                try {
                    const feedResponse = await nango.get({
                        endpoint: '/services/data/v59.0/query',
                        params: {
                            q: feedQuery
                        },
                        retries: 3
                    });

                    const feedItems = z
                        .object({
                            records: z.array(
                                z.object({
                                    Id: z.string(),
                                    CreatedDate: z.string(),
                                    CreatedById: z.string().nullable().optional(),
                                    Body: z.string().nullable().optional()
                                })
                            )
                        })
                        .parse(feedResponse.data);

                    for (const feedItem of feedItems.records) {
                        conversation.push({
                            id: feedItem.Id,
                            type: 'FeedItem',
                            created_date: feedItem.CreatedDate,
                            created_by: feedItem.CreatedById ?? undefined,
                            body: feedItem.Body ?? undefined
                        });
                    }
                } catch {
                    // Feed items may not be available, continue without them
                }

                // Sort conversation by created date
                conversation.sort((a, b) => new Date(a.created_date).getTime() - new Date(b.created_date).getTime());

                tickets.push({
                    id: caseRecord.Id,
                    case_number: caseRecord.CaseNumber,
                    subject: caseRecord.Subject ?? undefined,
                    description: caseRecord.Description ?? undefined,
                    status: caseRecord.Status ?? undefined,
                    priority: caseRecord.Priority ?? undefined,
                    origin: caseRecord.Origin ?? undefined,
                    reason: caseRecord.Reason ?? undefined,
                    owner_id: caseRecord.OwnerId ?? undefined,
                    account_id: caseRecord.AccountId ?? undefined,
                    contact_id: caseRecord.ContactId ?? undefined,
                    created_date: caseRecord.CreatedDate,
                    last_modified_date: caseRecord.LastModifiedDate,
                    conversation: conversation.length > 0 ? conversation : undefined
                });
            }

            await nango.batchSave(tickets, 'Ticket');

            // Save checkpoint from the last record's LastModifiedDate
            const lastRecord = cases[cases.length - 1];
            if (lastRecord?.LastModifiedDate) {
                await nango.saveCheckpoint({
                    updated_after: lastRecord.LastModifiedDate
                });
            }

            if (queryResult.done) {
                break;
            }

            nextRecordsUrl = queryResult.nextRecordsUrl;
            pageCount += 1;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
