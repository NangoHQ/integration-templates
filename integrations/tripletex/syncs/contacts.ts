import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const RawContactSchema = z.object({
    id: z.number(),
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
    displayName: z.string().nullish(),
    email: z.string().nullish(),
    phoneNumberMobile: z.string().nullish(),
    phoneNumberWork: z.string().nullish(),
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

        function parsePage(page: unknown[]): z.infer<typeof ContactSchema>[] {
            return page.map((record) => {
                const parsed = RawContactSchema.parse(record);
                return {
                    id: String(parsed.id),
                    ...(parsed.firstName != null && { firstName: parsed.firstName }),
                    ...(parsed.lastName != null && { lastName: parsed.lastName }),
                    ...(parsed.displayName != null && { displayName: parsed.displayName }),
                    ...(parsed.email != null && { email: parsed.email }),
                    ...(parsed.phoneNumberMobile != null && { phoneNumberMobile: parsed.phoneNumberMobile }),
                    ...(parsed.phoneNumberWork != null && { phoneNumberWork: parsed.phoneNumberWork }),
                    ...(parsed.isInactive != null && { isInactive: parsed.isInactive })
                };
            });
        }

        // Fetch and validate the first page before starting delete tracking, so a failed/malformed
        // initial response never leaves tracking open without a matching trackDeletesEnd.
        const paginator = nango.paginate(proxyConfig);
        const first = await paginator.next();
        const firstContacts = first.done ? [] : parsePage(first.value);

        await nango.trackDeletesStart('Contact');

        if (firstContacts.length > 0) {
            await nango.batchSave(firstContacts, 'Contact');
        }

        let result = await paginator.next();
        while (!result.done) {
            const contacts = parsePage(result.value);
            if (contacts.length > 0) {
                await nango.batchSave(contacts, 'Contact');
            }
            result = await paginator.next();
        }

        await nango.trackDeletesEnd('Contact');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
