import { createSync } from 'nango';
import { z } from 'zod';

const ContactSchema = z.object({
    id: z.string(),
    account: z.string().optional(),
    fullName: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    modified: z.string()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const MeResponseSchema = z.object({
    d: z.object({
        results: z.array(
            z.object({
                CurrentDivision: z.number()
            })
        )
    })
});

const ContactRecordSchema = z.object({
    ID: z.string(),
    Account: z.string().optional().nullable(),
    FullName: z.string().optional().nullable(),
    FirstName: z.string().optional().nullable(),
    LastName: z.string().optional().nullable(),
    Email: z.string().optional().nullable(),
    Phone: z.string().optional().nullable(),
    Modified: z.string()
});

const sync = createSync({
    description: 'Sync CRM contacts with incremental updates via Modified timestamp',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            path: '/syncs/contacts',
            method: 'GET'
        }
    ],
    models: {
        Contact: ContactSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-restapi
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const meParsed = MeResponseSchema.safeParse(meResponse.data);
        if (!meParsed.success) {
            throw new Error('Failed to parse current division from Me endpoint');
        }

        const firstResult = meParsed.data.d.results[0];
        if (!firstResult) {
            throw new Error('No results in Me endpoint response');
        }

        const division = firstResult.CurrentDivision;

        const updatedAfter = checkpoint?.['updated_after'];

        let hasMore = true;
        let skip = 0;
        const limit = 100;

        while (hasMore) {
            // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-restapi-contacts
            const response = await nango.get({
                endpoint: `/api/v1/${encodeURIComponent(division)}/crm/Contacts`,
                params: {
                    $select: 'ID,Account,FullName,FirstName,LastName,Email,Phone,Modified',
                    $orderby: 'Modified asc',
                    $top: limit,
                    $skip: skip,
                    ...(updatedAfter && { $filter: `Modified gt datetime'${updatedAfter}'` })
                },
                retries: 3
            });

            const rawData = response.data;
            let page: unknown[];

            if (rawData && typeof rawData === 'object' && 'd' in rawData) {
                const d = rawData.d;
                if (Array.isArray(d)) {
                    page = d;
                } else if (d && typeof d === 'object' && 'results' in d && Array.isArray(d.results)) {
                    page = d.results;
                } else {
                    throw new Error('Unexpected response format from Contacts endpoint');
                }
            } else {
                throw new Error('Unexpected response format from Contacts endpoint');
            }

            const contacts = page.map((item) => {
                const parsed = ContactRecordSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse contact record: ${parsed.error.message}`);
                }

                const record = parsed.data;
                return {
                    id: record.ID,
                    ...(record.Account != null && { account: record.Account }),
                    ...(record.FullName != null && { fullName: record.FullName }),
                    ...(record.FirstName != null && { firstName: record.FirstName }),
                    ...(record.LastName != null && { lastName: record.LastName }),
                    ...(record.Email != null && { email: record.Email }),
                    ...(record.Phone != null && { phone: record.Phone }),
                    modified: record.Modified
                };
            });

            if (contacts.length === 0) {
                break;
            }

            await nango.batchSave(contacts, 'Contact');

            const lastContact = contacts.at(-1);
            if (!lastContact) {
                break;
            }

            await nango.saveCheckpoint({
                updated_after: lastContact.modified
            });

            if (page.length < limit) {
                hasMore = false;
            }

            skip += page.length;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
