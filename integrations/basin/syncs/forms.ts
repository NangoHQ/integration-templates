import { createSync } from 'nango';
import { z } from 'zod';

const ProviderFormSchema = z
    .object({
        id: z.number(),
        name: z.string().optional(),
        uuid: z.string().nullable().optional(),
        project_id: z.number().optional(),
        redirect_url: z.string().nullable().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const FormSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    uuid: z.string().optional(),
    project_id: z.number().optional(),
    redirect_url: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync forms across all projects in this account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Form: FormSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : null;

        if (!checkpoint) {
            // Basin paginates the full list but exposes no changed-since filter or deleted feed.
            await nango.trackDeletesStart('Form');
        }

        let page = checkpoint?.page ?? 1;

        while (true) {
            const response = await nango.get({
                // https://docs.usebasin.com/developer-features/api-reference/
                endpoint: '/v1/forms/',
                params: {
                    page,
                    per_page: 50
                },
                retries: 3
            });

            const parsedBody = z
                .object({
                    forms: z.array(ProviderFormSchema)
                })
                .safeParse(response.data);

            if (!parsedBody.success) {
                throw new Error(`Failed to parse forms page: ${parsedBody.error.message}`);
            }

            const forms = parsedBody.data.forms.map((rawForm) => ({
                id: String(rawForm.id),
                ...(rawForm.name != null && { name: rawForm.name }),
                ...(rawForm.uuid != null && { uuid: rawForm.uuid }),
                ...(rawForm.project_id != null && { project_id: rawForm.project_id }),
                ...(rawForm.redirect_url != null && { redirect_url: rawForm.redirect_url }),
                ...(rawForm.created_at != null && { created_at: rawForm.created_at }),
                ...(rawForm.updated_at != null && { updated_at: rawForm.updated_at })
            }));

            if (forms.length === 0) {
                break;
            }

            await nango.batchSave(forms, 'Form');
            page += 1;
            await nango.saveCheckpoint({ page });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Form');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
