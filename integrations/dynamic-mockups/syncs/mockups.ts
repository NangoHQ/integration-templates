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

const ListMockupsResponseSchema = z.union([z.array(z.unknown()), z.object({ mockups: z.array(z.unknown()) }), z.object({ data: z.array(z.unknown()) })]);

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
        await nango.trackDeletesStart('Mockup');

        // https://docs.dynamicmockups.com/
        const response = await nango.get({
            endpoint: '/v1/mockups',
            retries: 3
        });

        const raw = ListMockupsResponseSchema.parse(response.data);
        let items: unknown[];
        if (Array.isArray(raw)) {
            items = raw;
        } else if ('mockups' in raw) {
            items = raw.mockups;
        } else if ('data' in raw) {
            items = raw.data;
        } else {
            throw new Error('Unexpected mockups list response shape');
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

        if (mockups.length > 0) {
            await nango.batchSave(mockups, 'Mockup');
        }

        await nango.trackDeletesEnd('Mockup');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
