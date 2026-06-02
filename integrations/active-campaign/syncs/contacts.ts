import { createSync } from 'nango';
import { z } from 'zod';

const ContactSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    organizationId: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    last_id: z.number().int()
});

const LegacyCheckpointSchema = z.object({
    updated_after: z.string()
});

const ProviderResponseSchema = z.object({
    contacts: z.array(z.unknown()).optional()
});

const ProviderContactSchema = z.object({
    id: z.union([z.string(), z.number()]),
    email: z.string().nullish(),
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
    phone: z.string().nullish(),
    cdate: z.string().nullish(),
    udate: z.string().nullish(),
    orgid: z.union([z.string(), z.number()]).nullish()
});

type Contact = {
    id: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    createdAt?: string;
    updatedAt?: string;
    organizationId?: string;
};

const sync = createSync({
    description: 'Sync contacts from ActiveCampaign.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Contact: ContactSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/contacts'
        }
    ],

    exec: async (nango) => {
        const checkpointRaw = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(checkpointRaw);
        const legacyCheckpointResult = LegacyCheckpointSchema.safeParse(checkpointRaw);
        const updatedAfter = checkpointResult.success
            ? checkpointResult.data.updated_after
            : legacyCheckpointResult.success
              ? legacyCheckpointResult.data.updated_after
              : '1970-01-01T00:00:00.000Z';
        const syncStartTime = new Date().toISOString();
        let lastId = checkpointResult.success ? checkpointResult.data.last_id : 0;

        while (true) {
            const response = await nango.get({
                // https://developers.activecampaign.com/reference/list-all-contacts
                endpoint: '/3/contacts',
                params: {
                    'orders[id]': 'ASC',
                    'filters[updated_after]': updatedAfter,
                    ...(lastId > 0 ? { id_greater: lastId } : {}),
                    limit: 100
                },
                retries: 3
            });

            const providerContacts = z.array(ProviderContactSchema).parse(ProviderResponseSchema.parse(response.data).contacts ?? []);
            if (providerContacts.length === 0) {
                break;
            }

            const contacts = providerContacts.map((record) => {
                const mapped: Contact = {
                    id: String(record.id)
                };
                if (record.email != null && record.email !== '') {
                    mapped.email = record.email;
                }
                if (record.firstName != null && record.firstName !== '') {
                    mapped.firstName = record.firstName;
                }
                if (record.lastName != null && record.lastName !== '') {
                    mapped.lastName = record.lastName;
                }
                if (record.phone != null && record.phone !== '') {
                    mapped.phone = record.phone;
                }
                if (record.cdate != null && record.cdate !== '') {
                    mapped.createdAt = record.cdate;
                }
                if (record.udate != null && record.udate !== '') {
                    mapped.updatedAt = record.udate;
                }
                if (record.orgid != null) {
                    const orgIdStr = String(record.orgid);
                    if (orgIdStr !== '' && orgIdStr !== '0') {
                        mapped.organizationId = orgIdStr;
                    }
                }

                return mapped;
            });

            if (contacts.length > 0) {
                await nango.batchSave(contacts, 'Contact');
            }

            const pageLastId = Number(providerContacts[providerContacts.length - 1]?.id ?? lastId);
            if (pageLastId <= lastId) {
                throw new Error(
                    `Sync aborted: page returned non-increasing contact IDs (last seen ${lastId}, page last ${pageLastId}). Checkpoint not advanced.`
                );
            }

            lastId = pageLastId;
            await nango.saveCheckpoint({
                updated_after: updatedAfter,
                last_id: lastId
            });

            if (providerContacts.length < 100) {
                break;
            }
        }

        await nango.saveCheckpoint({
            updated_after: syncStartTime,
            last_id: 0
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
