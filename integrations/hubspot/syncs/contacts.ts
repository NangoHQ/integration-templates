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

const HubspotContactSchema = z.object({
    id: z.string(),
    properties: z
        .object({
            firstname: z.string().nullish(),
            lastname: z.string().nullish(),
            email: z.string().nullish(),
            phone: z.string().nullish(),
            jobtitle: z.string().nullish(),
            company: z.string().nullish(),
            createdate: z.string().nullish(),
            lastmodifieddate: z.string().nullish()
        })
        .nullish(),
    createdAt: z.string().nullish(),
    updatedAt: z.string().nullish()
});

const ContactResponseSchema = z.object({
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

const HubspotCrmCheckpointSchema = z.object({
    phase: z.string(),
    after: z.string(),
    updatedAfter: z.string()
});

type HubspotCrmCheckpoint = {
    phase: 'initial' | 'incremental';
    after?: string;
    updatedAfter?: string;
};

function parseHubspotCrmCheckpoint(value: unknown): HubspotCrmCheckpoint | undefined {
    const result = HubspotCrmCheckpointSchema.safeParse(value);
    if (!result.success) {
        return undefined;
    }

    const { phase, after, updatedAfter } = result.data;
    if (phase !== 'initial' && phase !== 'incremental') {
        return undefined;
    }

    const checkpoint: HubspotCrmCheckpoint = { phase };

    if (after) {
        checkpoint.after = after;
    }

    if (updatedAfter) {
        checkpoint.updatedAfter = updatedAfter;
    }

    return checkpoint;
}

function updateLatestUpdatedAt(current: string | undefined, candidate: string | null | undefined): string | undefined {
    if (!candidate) {
        return current;
    }

    return !current || candidate > current ? candidate : current;
}

const sync = createSync({
    description: 'Sync contacts',
    version: '4.0.0',
    endpoints: [{ method: 'POST', path: '/syncs/contacts', group: 'Contacts' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: HubspotCrmCheckpointSchema,

    models: {
        Contact: ContactSchema
    },

    exec: async (nango) => {
        const checkpoint = parseHubspotCrmCheckpoint(await nango.getCheckpoint());
        const shouldUseInitialListSync = checkpoint?.phase !== 'incremental' || !checkpoint.updatedAfter;

        if (shouldUseInitialListSync) {
            let after = checkpoint?.after;
            let latestUpdatedAt = checkpoint?.updatedAfter;
            let hasMore = true;

            while (hasMore) {
                // https://developers.hubspot.com/docs/api-reference/crm-contacts-v3/basic/get-crm-v3-objects-contacts
                const response = await nango.get({
                    endpoint: '/crm/v3/objects/contacts',
                    params: {
                        limit: '100',
                        properties: 'firstname,lastname,email,phone,jobtitle,company,createdate,lastmodifieddate',
                        ...(after && { after })
                    },
                    retries: 3
                });

                const data = ContactResponseSchema.parse(response.data);
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
                    createdAt: contact.createdAt ?? contact.properties?.['createdate'] ?? undefined,
                    updatedAt: contact.updatedAt ?? contact.properties?.['lastmodifieddate'] ?? undefined
                }));

                await nango.batchSave(records, 'Contact');

                latestUpdatedAt = records.reduce((latest, record) => updateLatestUpdatedAt(latest, record.updatedAt), latestUpdatedAt);

                const nextAfter = data.paging?.next?.after;

                if (nextAfter) {
                    await nango.saveCheckpoint({
                        phase: 'initial',
                        after: nextAfter,
                        updatedAfter: latestUpdatedAt || ''
                    });
                    after = nextAfter;
                    continue;
                }

                if (latestUpdatedAt) {
                    await nango.saveCheckpoint({
                        phase: 'incremental',
                        after: '',
                        updatedAfter: latestUpdatedAt
                    });
                }

                hasMore = false;
            }

            return;
        }

        const updatedAfter = checkpoint.updatedAfter;
        let after = checkpoint.after;
        let latestUpdatedAt = updatedAfter;
        let hasMore = true;

        while (hasMore) {
            const searchBody: Record<string, unknown> = {
                limit: 100,
                properties: ['firstname', 'lastname', 'email', 'phone', 'jobtitle', 'company', 'createdate', 'lastmodifieddate'],
                sorts: [
                    {
                        propertyName: 'lastmodifieddate',
                        direction: 'ASCENDING'
                    }
                ],
                filterGroups: [
                    {
                        filters: [
                            {
                                propertyName: 'lastmodifieddate',
                                operator: 'GT',
                                value: updatedAfter
                            }
                        ]
                    }
                ],
                ...(after && { after })
            };

            // Incremental syncs use search so they can filter by last modified date.
            // HubSpot search queries are capped at 10,000 total results; paging past that returns a 400 and can leave this incremental sync incomplete.
            // Template users should narrow the search window/filter strategy to fit their data volume before relying on this template.
            // https://developers.hubspot.com/docs/api-reference/search/guide#paging-through-results
            const response = await nango.post({
                endpoint: '/crm/v3/objects/contacts/search',
                data: searchBody,
                retries: 3
            });

            const data = ContactResponseSchema.parse(response.data);
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
                createdAt: contact.createdAt ?? contact.properties?.['createdate'] ?? undefined,
                updatedAt: contact.updatedAt ?? contact.properties?.['lastmodifieddate'] ?? undefined
            }));

            await nango.batchSave(records, 'Contact');

            latestUpdatedAt = records.reduce((latest, record) => updateLatestUpdatedAt(latest, record.updatedAt), latestUpdatedAt);

            const nextAfter = data.paging?.next?.after;

            if (nextAfter) {
                await nango.saveCheckpoint({
                    phase: 'incremental',
                    after: nextAfter,
                    updatedAfter: updatedAfter || ''
                });
                after = nextAfter;
                continue;
            }

            if (latestUpdatedAt) {
                await nango.saveCheckpoint({
                    phase: 'incremental',
                    after: '',
                    updatedAfter: latestUpdatedAt
                });
            }

            hasMore = false;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
