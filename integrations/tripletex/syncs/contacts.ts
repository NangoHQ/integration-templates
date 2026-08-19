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

const CheckpointSchema = z.object({
    from: z.number()
});

const DEFAULT_CHECKPOINT = {
    from: 0
};

const sync = createSync({
    description: 'Sync contacts.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Contact: ContactSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.parse({
            ...DEFAULT_CHECKPOINT,
            ...(checkpoint ?? {})
        });
        const startFrom = parsedCheckpoint['from'];

        await nango.trackDeletesStart('Contact');

        let nextFrom: number | undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
            endpoint: 'v2/contact',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'from',
                offset_start_value: startFrom,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'count',
                limit: 100,
                response_path: 'values',
                on_page: async ({ nextPageParam }) => {
                    if (typeof nextPageParam === 'number') {
                        nextFrom = nextPageParam;
                    } else {
                        nextFrom = undefined;
                    }
                }
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

        for await (const pageResults of nango.paginate(proxyConfig)) {
            if (!Array.isArray(pageResults)) {
                throw new Error('Expected paginate page to be an array');
            }

            const contacts = parsePage(pageResults);
            if (contacts.length > 0) {
                await nango.batchSave(contacts, 'Contact');
            }

            if (nextFrom !== undefined) {
                await nango.saveCheckpoint({ from: nextFrom });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Contact');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
