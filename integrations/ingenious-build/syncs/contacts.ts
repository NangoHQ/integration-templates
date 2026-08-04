import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const RawContactSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    full_name: z.string().optional(),
    email: z.string().optional(),
    title: z.string().nullable().optional(),
    prefix: z.string().nullable().optional(),
    office_phone: z.string().nullable().optional(),
    cell_phone: z.string().nullable().optional(),
    country_code: z.string().nullable().optional(),
    internal_notes: z.string().nullable().optional(),
    is_archived: z.boolean().optional(),
    status: z.string().optional(),
    company_id: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ContactSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    full_name: z.string().optional(),
    email: z.string().optional(),
    title: z.string().optional(),
    prefix: z.string().optional(),
    office_phone: z.string().optional(),
    cell_phone: z.string().optional(),
    country_code: z.string().optional(),
    internal_notes: z.string().optional(),
    is_archived: z.boolean().optional(),
    status: z.string().optional(),
    company_id: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync contacts (individual people) across companies in this workspace.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Contact: ContactSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let nextPage: number | undefined = checkpoint && typeof checkpoint['page'] === 'number' ? checkpoint['page'] : 1;

        // Blocker: provider only exposes /api/v2/pub/contacts with page/per_page pagination.
        // No incremental/modified-since filter was found on this endpoint's query params,
        // so resume the current full refresh by checkpointing the next page.
        if (nextPage === 1) {
            await nango.trackDeletesStart('Contact');
        }

        const proxyConfig: ProxyConfiguration = {
            // https://api.ingenious.build/reference/indexcontactpubv2.md
            endpoint: '/api/v2/pub/contacts',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: nextPage ?? 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'items',
                on_page: async ({ nextPageParam }) => {
                    nextPage = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const contacts = [];
            for (const raw of page) {
                const parsed = RawContactSchema.parse(raw);
                contacts.push(
                    ContactSchema.parse({
                        id: parsed.id,
                        first_name: parsed.first_name ?? undefined,
                        last_name: parsed.last_name ?? undefined,
                        full_name: parsed.full_name ?? undefined,
                        email: parsed.email ?? undefined,
                        title: parsed.title ?? undefined,
                        prefix: parsed.prefix ?? undefined,
                        office_phone: parsed.office_phone ?? undefined,
                        cell_phone: parsed.cell_phone ?? undefined,
                        country_code: parsed.country_code ?? undefined,
                        internal_notes: parsed.internal_notes ?? undefined,
                        is_archived: parsed.is_archived ?? undefined,
                        status: parsed.status ?? undefined,
                        company_id: parsed.company_id ?? undefined,
                        created_at: parsed.created_at ?? undefined,
                        updated_at: parsed.updated_at ?? undefined
                    })
                );
            }

            if (contacts.length > 0) {
                await nango.batchSave(contacts, 'Contact');
            }

            if (nextPage !== undefined) {
                await nango.saveCheckpoint({ page: nextPage });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Contact');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
