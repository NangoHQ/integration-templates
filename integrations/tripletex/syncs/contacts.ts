import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const RawContactSchema = z.object({
    id: z.number(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    displayName: z.string().optional(),
    email: z.string().optional(),
    phoneNumberMobile: z.string().optional(),
    phoneNumberWork: z.string().optional(),
    isInactive: z.boolean().optional()
});

const ContactSchema = z.object({
    id: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    displayName: z.string().optional(),
    email: z.string().optional(),
    phoneNumberMobile: z.string().optional(),
    phoneNumberWork: z.string().optional(),
    isInactive: z.boolean().optional()
});

const sync = createSync({
    description: 'Sync contacts.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Contact: ContactSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('Contact');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
            endpoint: 'v2/contact',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'from',
                offset_start_value: 0,
                limit_name_in_request: 'count',
                limit: 100,
                response_path: 'values'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const contacts = page.map((record) => {
                const parsed = RawContactSchema.parse(record);
                return {
                    id: String(parsed.id),
                    ...(parsed.firstName !== undefined && { firstName: parsed.firstName }),
                    ...(parsed.lastName !== undefined && { lastName: parsed.lastName }),
                    ...(parsed.displayName !== undefined && { displayName: parsed.displayName }),
                    ...(parsed.email !== undefined && { email: parsed.email }),
                    ...(parsed.phoneNumberMobile !== undefined && { phoneNumberMobile: parsed.phoneNumberMobile }),
                    ...(parsed.phoneNumberWork !== undefined && { phoneNumberWork: parsed.phoneNumberWork }),
                    ...(parsed.isInactive !== undefined && { isInactive: parsed.isInactive })
                };
            });

            if (contacts.length === 0) {
                continue;
            }

            await nango.batchSave(contacts, 'Contact');
        }

        await nango.trackDeletesEnd('Contact');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
