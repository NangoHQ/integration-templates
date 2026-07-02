import { createSync } from 'nango';
import { z } from 'zod';

const FormAttributesSchema = z.object({
    name: z.string().optional(),
    status: z.string().optional(),
    ab_test: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const FormDataSchema = z.object({
    type: z.string(),
    id: z.string(),
    attributes: FormAttributesSchema.optional(),
    links: z
        .object({
            self: z.string().optional()
        })
        .optional(),
    relationships: z.unknown().optional()
});

const FormsResponseSchema = z.object({
    data: z.array(FormDataSchema),
    links: z
        .object({
            self: z.string().optional(),
            prev: z.string().nullable().optional(),
            next: z.string().nullable().optional()
        })
        .optional()
});

const FormSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    status: z.string().optional(),
    ab_test: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const sync = createSync({
    description: 'Sync forms.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Form: FormSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('Form');

        let nextCursor: string | undefined;
        const limit = 100;

        do {
            // https://developers.klaviyo.com/en/reference/get_forms
            const response = await nango.get({
                endpoint: '/api/forms',
                params: {
                    'page[size]': limit,
                    ...(nextCursor && { 'page[cursor]': nextCursor })
                },
                headers: {
                    revision: '2026-04-15'
                },
                retries: 3
            });

            const parsed = FormsResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse forms response: ${parsed.error.message}`);
            }

            const forms = parsed.data.data.map((item) => {
                const attrs = item.attributes ?? {};
                return {
                    id: item.id,
                    ...(attrs.name !== undefined && { name: attrs.name }),
                    ...(attrs.status !== undefined && { status: attrs.status }),
                    ...(attrs.ab_test !== undefined && { ab_test: attrs.ab_test }),
                    ...(attrs.created_at !== undefined && { created_at: attrs.created_at }),
                    ...(attrs.updated_at !== undefined && { updated_at: attrs.updated_at })
                };
            });

            if (forms.length > 0) {
                await nango.batchSave(forms, 'Form');
            }

            const nextLink = parsed.data.links?.next;
            if (nextLink) {
                const url = new URL(nextLink);
                const cursor = url.searchParams.get('page[cursor]');
                nextCursor = cursor ?? undefined;
            } else {
                nextCursor = undefined;
            }
        } while (nextCursor !== undefined);

        await nango.trackDeletesEnd('Form');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
