import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ContactSchema = z.object({
    id: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    mobile: z.string().optional(),
    accountId: z.string().optional(),
    photoURL: z.string().optional(),
    webUrl: z.string().optional(),
    createdTime: z.string().optional(),
    modifiedTime: z.string().optional(),
    isDeleted: z.boolean().optional(),
    isTrashed: z.boolean().optional(),
    isSpam: z.boolean().optional(),
    isAnonymous: z.boolean().optional(),
    isEndUser: z.boolean().optional(),
    ownerId: z.string().optional(),
    type: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    language: z.string().optional(),
    country: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    street: z.string().optional(),
    zip: z.string().optional(),
    twitter: z.string().optional(),
    facebook: z.string().optional(),
    secondaryEmail: z.string().optional(),
    customerHappiness: z
        .object({
            badPercentage: z.string().optional(),
            okPercentage: z.string().optional(),
            goodPercentage: z.string().optional()
        })
        .optional(),
    zohoCRMContact: z
        .object({
            id: z.string().optional(),
            type: z.string().optional()
        })
        .optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    from: z.number()
});

const ProviderContactSchema = z.object({
    id: z.string(),
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
    email: z.string().nullish(),
    phone: z.string().nullish(),
    mobile: z.string().nullish(),
    accountId: z.string().nullish(),
    photoURL: z.string().nullish(),
    webUrl: z.string().nullish(),
    createdTime: z.string().nullish(),
    modifiedTime: z.string().nullish(),
    isDeleted: z.boolean().nullish(),
    isTrashed: z.boolean().nullish(),
    isSpam: z.boolean().nullish(),
    isAnonymous: z.boolean().nullish(),
    isEndUser: z.boolean().nullish(),
    ownerId: z.string().nullish(),
    type: z.string().nullish(),
    title: z.string().nullish(),
    description: z.string().nullish(),
    language: z.string().nullish(),
    country: z.string().nullish(),
    city: z.string().nullish(),
    state: z.string().nullish(),
    street: z.string().nullish(),
    zip: z.string().nullish(),
    twitter: z.string().nullish(),
    facebook: z.string().nullish(),
    secondaryEmail: z.string().nullish(),
    customerHappiness: z
        .object({
            badPercentage: z.string().nullish(),
            okPercentage: z.string().nullish(),
            goodPercentage: z.string().nullish()
        })
        .nullish(),
    zohoCRMContact: z
        .object({
            id: z.string().nullish(),
            type: z.string().nullish()
        })
        .nullish()
});

const sync = createSync({
    description: 'Sync contacts.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [{ method: 'POST', path: '/syncs/contacts' }],
    models: {
        Contact: ContactSchema
    },

    exec: async (nango) => {
        const connection = await nango.getConnection();
        const extension = typeof connection.connection_config?.['extension'] === 'string' ? connection.connection_config['extension'] : 'com';
        const baseUrl = `https://desk.zoho.${extension}/api/v1`;

        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
        const updatedAfter = parsedCheckpoint.success ? parsedCheckpoint.data.updated_after || undefined : undefined;
        const startFrom = parsedCheckpoint.success ? parsedCheckpoint.data.from : 0;
        const now = new Date().toISOString();
        let nextFrom: number | undefined;
        const limit = 100;

        const params: Record<string, string> = {
            sortBy: 'modifiedTime'
        };

        if (updatedAfter) {
            params['modifiedTimeRange'] = `${updatedAfter},${now}`;
        }

        // https://desk.zoho.com/DeskAPIDocument
        // https://desk.zoho.com/DeskAPIDocument#Contacts-SearchContacts
        const proxyConfig: ProxyConfiguration = {
            // https://desk.zoho.com/DeskAPIDocument#Contacts-SearchContacts
            endpoint: 'contacts/search',
            baseUrlOverride: baseUrl,
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'from',
                offset_calculation_method: 'by-response-size',
                offset_start_value: startFrom,
                limit_name_in_request: 'limit',
                limit: limit,
                response_path: 'data',
                on_page: async ({ nextPageParam }) => {
                    nextFrom = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const rawItems = page;
            if (!Array.isArray(rawItems)) {
                throw new Error('Expected contacts response data to be an array');
            }

            const contacts: z.infer<typeof ContactSchema>[] = [];
            for (const rawItem of rawItems) {
                const parsed = ProviderContactSchema.safeParse(rawItem);
                if (!parsed.success) {
                    throw new Error(`Failed to parse contact: ${parsed.error.message}`);
                }
                const record = parsed.data;
                contacts.push({
                    id: record.id,
                    ...(record.firstName != null && { firstName: record.firstName }),
                    ...(record.lastName != null && { lastName: record.lastName }),
                    ...(record.email != null && { email: record.email }),
                    ...(record.phone != null && { phone: record.phone }),
                    ...(record.mobile != null && { mobile: record.mobile }),
                    ...(record.accountId != null && { accountId: record.accountId }),
                    ...(record.photoURL != null && { photoURL: record.photoURL }),
                    ...(record.webUrl != null && { webUrl: record.webUrl }),
                    ...(record.createdTime != null && { createdTime: record.createdTime }),
                    ...(record.modifiedTime != null && { modifiedTime: record.modifiedTime }),
                    ...(record.isDeleted != null && { isDeleted: record.isDeleted }),
                    ...(record.isTrashed != null && { isTrashed: record.isTrashed }),
                    ...(record.isSpam != null && { isSpam: record.isSpam }),
                    ...(record.isAnonymous != null && { isAnonymous: record.isAnonymous }),
                    ...(record.isEndUser != null && { isEndUser: record.isEndUser }),
                    ...(record.ownerId != null && { ownerId: record.ownerId }),
                    ...(record.type != null && { type: record.type }),
                    ...(record.title != null && { title: record.title }),
                    ...(record.description != null && { description: record.description }),
                    ...(record.language != null && { language: record.language }),
                    ...(record.country != null && { country: record.country }),
                    ...(record.city != null && { city: record.city }),
                    ...(record.state != null && { state: record.state }),
                    ...(record.street != null && { street: record.street }),
                    ...(record.zip != null && { zip: record.zip }),
                    ...(record.twitter != null && { twitter: record.twitter }),
                    ...(record.facebook != null && { facebook: record.facebook }),
                    ...(record.secondaryEmail != null && { secondaryEmail: record.secondaryEmail }),
                    ...(record.customerHappiness != null && {
                        customerHappiness: {
                            ...(record.customerHappiness.badPercentage != null && { badPercentage: record.customerHappiness.badPercentage }),
                            ...(record.customerHappiness.okPercentage != null && { okPercentage: record.customerHappiness.okPercentage }),
                            ...(record.customerHappiness.goodPercentage != null && { goodPercentage: record.customerHappiness.goodPercentage })
                        }
                    }),
                    ...(record.zohoCRMContact != null && {
                        zohoCRMContact: {
                            ...(record.zohoCRMContact.id != null && { id: record.zohoCRMContact.id }),
                            ...(record.zohoCRMContact.type != null && { type: record.zohoCRMContact.type })
                        }
                    })
                });
            }

            if (contacts.length > 0) {
                await nango.batchSave(contacts, 'Contact');
            }

            if (nextFrom !== undefined) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter || '',
                    from: nextFrom
                });
            }
        }

        await nango.saveCheckpoint({
            updated_after: now,
            from: 0
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
