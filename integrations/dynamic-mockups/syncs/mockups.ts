import { createSync } from 'nango';
import { z } from 'zod';

const SmartObjectSchema = z
    .object({
        uuid: z.string(),
        name: z.string().optional()
    })
    .passthrough();

const PsdSchema = z
    .object({
        uuid: z.string(),
        name: z.string().optional()
    })
    .passthrough();

const ProviderMockupSchema = z
    .object({
        uuid: z.string(),
        name: z.string().optional().nullable(),
        smart_objects: z.array(SmartObjectSchema).optional(),
        psd: PsdSchema.optional()
    })
    .passthrough();

const MockupSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        uuid: z.string(),
        smart_objects: z.array(SmartObjectSchema).optional(),
        psd: PsdSchema.optional()
    })
    .passthrough();

const ListMockupsResponseSchema = z.union([
    z.array(z.unknown()),
    z.object({ mockups: z.array(z.unknown()), success: z.boolean().optional(), message: z.string().optional() }),
    z.object({ data: z.array(z.unknown()), success: z.boolean().optional(), message: z.string().optional() })
]);

const sync = createSync({
    description: 'Sync mockup templates (both classic PSD-based and MockAnything AI-generated) in this account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Mockup: MockupSchema
    },

    exec: async (nango) => {
        // Blocker: provider only exposes /api/v1/mockups with no changed-since filter,
        // no deleted-record endpoint, no resumable cursor, and no timestamp fields
        // on mockup objects. Full refresh is required.

        // https://docs.dynamicmockups.com/api-reference/get-mockups-api
        // include_all_catalogs is required, otherwise the provider only returns mockups from the default catalog.
        const response = await nango.get({
            endpoint: '/v1/mockups',
            params: {
                include_all_catalogs: 'true'
            },
            retries: 3
        });

        const raw = ListMockupsResponseSchema.parse(response.data);
        let items: unknown[];
        if (Array.isArray(raw)) {
            items = raw;
        } else if ('mockups' in raw) {
            if (raw.success === false) {
                throw new Error(`Provider returned an unsuccessful mockups response: ${raw.message ?? 'unknown error'}`);
            }
            items = raw.mockups;
        } else {
            if (raw.success === false) {
                throw new Error(`Provider returned an unsuccessful mockups response: ${raw.message ?? 'unknown error'}`);
            }
            items = raw.data;
        }

        const mockups = items.map((item) => {
            const parsed = ProviderMockupSchema.parse(item);
            const { name, ...rest } = parsed;
            return {
                id: parsed.uuid,
                ...(name != null && { name }),
                ...rest
            };
        });

        await nango.trackDeletesStart('Mockup');

        if (mockups.length > 0) {
            await nango.batchSave(mockups, 'Mockup');
        }

        await nango.trackDeletesEnd('Mockup');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
