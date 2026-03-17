import { createSync } from 'nango';
import { z } from 'zod';

const ContactSchema = z.object({
    id: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    jobTitle: z.string().optional(),
    company: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const CheckpointSchema = z.object({
    updatedAfter: z.string()
});

const HubspotContactSchema = z.object({
    id: z.string(),
    properties: z
        .object({
            firstname: z.string().nullish(),
            lastname: z.string().nullish(),
            email: z.string().nullish(),
            phone: z.string().nullish(),
            jobtitle: z.string().nullish(),
            company: z.string().nullish()
        })
        .nullish(),
    createdAt: z.string().nullish(),
    updatedAt: z.string().nullish()
});

const ContactSearchResponseSchema = z.object({
    results: z.array(HubspotContactSchema).optional(),
    paging: z
        .object({
            next: z
                .object({
                    after: z.string()
                })
                .optional()
        })
        .optional()
});

function parseOptional<T>(schema: z.ZodType<T>, value: unknown): T | undefined {
    const result = schema.safeParse(value);
    return result.success ? result.data : undefined;
}

const sync = createSync({
    description: 'Sync contacts',
    version: '1.0.0',
    endpoints: [{ method: 'POST', path: '/syncs/sync-contacts', group: 'Contacts' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,

    models: {
        Contact: ContactSchema
    },

    exec: async (nango) => {
        const checkpoint = parseOptional(CheckpointSchema, await nango.getCheckpoint());
        const updatedAfter = checkpoint?.updatedAfter;

        const searchBody: Record<string, unknown> = {
            limit: 100,
            properties: ['firstname', 'lastname', 'email', 'phone', 'jobtitle', 'company'],
            sorts: [
                {
                    propertyName: 'lastmodifieddate',
                    direction: 'ASCENDING'
                }
            ]
        };

        if (updatedAfter) {
            searchBody['filterGroups'] = [
                {
                    filters: [
                        {
                            propertyName: 'lastmodifieddate',
                            operator: 'GT',
                            value: updatedAfter
                        }
                    ]
                }
            ];
        }

        let after: string | undefined;
        let latestUpdatedAt = updatedAfter;

        do {
            if (after) {
                searchBody['after'] = after;
            } else {
                delete searchBody['after'];
            }

            // https://developers.hubspot.com/docs/api-reference/search/guide#paging-through-results
            const response = await nango.post({
                endpoint: '/crm/v3/objects/contacts/search',
                data: searchBody,
                retries: 3
            });

            const data = ContactSearchResponseSchema.parse(response.data);
            const contacts = data.results || [];

            if (contacts.length === 0) {
                break;
            }

            const records = contacts.map((contact) => ({
                id: contact.id,
                firstName: contact.properties?.['firstname'] ?? undefined,
                lastName: contact.properties?.['lastname'] ?? undefined,
                email: contact.properties?.['email'] ?? undefined,
                phone: contact.properties?.['phone'] ?? undefined,
                jobTitle: contact.properties?.['jobtitle'] ?? undefined,
                company: contact.properties?.['company'] ?? undefined,
                createdAt: contact.createdAt ?? undefined,
                updatedAt: contact.updatedAt ?? undefined
            }));

            if (records.length === 0) {
                continue;
            }

            await nango.batchSave(records, 'Contact');

            const lastRecord = records[records.length - 1];
            if (lastRecord && lastRecord.updatedAt) {
                latestUpdatedAt = lastRecord.updatedAt;
                await nango.saveCheckpoint({
                    updatedAfter: latestUpdatedAt
                });
            }

            after = data.paging?.next?.after;
        } while (after);
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
