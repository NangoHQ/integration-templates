import { createSync } from 'nango';
import { z } from 'zod';

const ProviderMcTemplateSchema = z
    .object({
        id: z.union([z.string(), z.number()]).optional(),
        name: z.string(),
        slug: z.string().optional(),
        code: z.string().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const McTemplateSchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string().optional(),
    code: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const sync = createSync({
    description: 'Sync all Mailchimp (not Mandrill) templates available to this account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        McTemplate: McTemplateSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('McTemplate');

        // https://mailchimp.com/developer/transactional/api/mailchimp-templates/
        const response = await nango.post({
            endpoint: '/1.3/mctemplates/list.json',
            retries: 3
        });

        const raw = response.data;
        if (!Array.isArray(raw)) {
            throw new Error('Expected array response from mctemplates/list');
        }

        const templates = raw.map((item: unknown) => {
            const parsed = ProviderMcTemplateSchema.safeParse(item);
            if (!parsed.success) {
                throw new Error(`Failed to parse mctemplates/list item: ${parsed.error.message}`);
            }

            const record = parsed.data;
            const id = record.id !== undefined && record.id !== null ? String(record.id) : (record.slug ?? record.name);

            return {
                id,
                name: record.name,
                slug: record.slug,
                code: record.code,
                created_at: record.created_at,
                updated_at: record.updated_at
            };
        });

        if (templates.length > 0) {
            await nango.batchSave(templates, 'McTemplate');
        }

        await nango.trackDeletesEnd('McTemplate');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
