import { createSync } from 'nango';
import { z } from 'zod';

const ContactSchema = z.object({
    id: z.string(),
    first_name: z.union([z.string(), z.null()]),
    last_name: z.union([z.string(), z.null()]),
    email: z.union([z.string(), z.null()]),
    phone: z.union([z.string(), z.null()]),
    job_title: z.union([z.string(), z.null()]),
    company: z.union([z.string(), z.null()]),
    created_at: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()])
});

const CheckpointSchema = z.object({
    after: z.string()
});

type Checkpoint = z.infer<typeof CheckpointSchema>;

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
        const checkpoint = (await nango.getCheckpoint()) as Checkpoint | null;
        let after = checkpoint?.after || undefined;

        while (true) {
            const response = await nango.get<{
                results?: any[];
                paging?: { next?: { after?: string } };
            }>({
                // https://developers.hubspot.com/docs/api-reference/crm-contacts-v3/guide
                endpoint: '/crm/v3/objects/contacts',
                params: {
                    properties: 'firstname,lastname,email,phone,jobtitle,company',
                    limit: '100',
                    ...(after && { after })
                },
                retries: 3
            });

            const records = (response.data.results ?? []).map((contact) => ({
                id: contact.id,
                first_name: contact.properties?.['firstname'] ?? null,
                last_name: contact.properties?.['lastname'] ?? null,
                email: contact.properties?.['email'] ?? null,
                phone: contact.properties?.['phone'] ?? null,
                job_title: contact.properties?.['jobtitle'] ?? null,
                company: contact.properties?.['company'] ?? null,
                created_at: contact.createdAt ?? null,
                updated_at: contact.updatedAt ?? null
            }));

            if (records.length === 0) {
                break;
            }

            await nango.batchSave(records, 'Contact');

            const nextAfter = response.data.paging?.next?.after;
            if (nextAfter) {
                after = nextAfter;
                await nango.saveCheckpoint({
                    after
                });
                continue;
            }

            break;
        }

        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
