import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const FormSchema = z
    .object({
        id: z.string().describe('Unique identifier of the form, e.g. "262715780901055"'),
        username: z.string().optional().describe('Username of the Jotform account that owns the form'),
        title: z.string().optional().describe('Title of the form'),
        height: z.string().optional().describe('Height of the form in pixels, returned as a string, e.g. "690"'),
        status: z
            .string()
            .optional()
            .describe(
                'Status of the form, e.g. "ENABLED" or "DISABLED". Forms whose status is "DELETED" are removed from the synced records instead of being saved'
            ),
        created_at: z.string().optional().describe('Creation date of the form in "YYYY-MM-DD HH:mm:ss" format, e.g. "2026-10-01 14:36:20"'),
        updated_at: z.string().optional().describe('Date the form was last updated in "YYYY-MM-DD HH:mm:ss" format'),
        last_submission: z
            .string()
            .optional()
            .describe('Date of the most recent submission in "YYYY-MM-DD HH:mm:ss" format. Omitted when the form has no submissions'),
        new: z.string().optional().describe('Number of unread submissions on the form, returned as a string, e.g. "0"'),
        count: z.string().optional().describe('Total number of submissions on the form, returned as a string, e.g. "10"'),
        type: z.string().optional().describe('Layout type of the form, e.g. "LEGACY" or "CARD"'),
        favorite: z.string().optional().describe('"1" when the form is marked as a favorite, otherwise "0"'),
        archived: z.string().optional().describe('"1" when the form is archived, otherwise "0"'),
        url: z.string().optional().describe('Public URL of the form, e.g. "https://form.jotform.com/262715780901055"')
    })
    .describe('A form owned by the authenticated Jotform user');

const ProviderFormSchema = z.object({
    id: z.string(),
    username: z.string().optional(),
    title: z.string().optional(),
    height: z.string().optional(),
    status: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    last_submission: z.string().nullable().optional(),
    new: z.string().optional(),
    count: z.string().optional(),
    type: z.string().optional(),
    favorite: z.string().optional(),
    archived: z.string().optional(),
    url: z.string().optional()
});

const CheckpointSchema = z
    .object({
        offset: z
            .number()
            .int()
            .nonnegative()
            .describe('Offset of the next page to fetch from GET /user/forms when a previous execution did not finish the full refresh')
    })
    .describe('Pagination progress of the full refresh, used to resume an interrupted execution');

const sync = createSync({
    description: 'Sync all forms owned by the authenticated Jotform user.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Form: FormSchema
    },

    exec: async (nango) => {
        // Full refresh: GET /user/forms has no modified-since filter, so every run
        // walks all pages. Deleted forms keep appearing in the list with status
        // "DELETED" instead of disappearing, so deletions are detected from the
        // status field rather than from absence in the list.
        // getCheckpoint() is only typed against CheckpointSchema at compile time, not validated
        // at runtime, so a malformed persisted value (e.g. a negative or fractional offset from
        // an older schema version) is re-validated here and discarded rather than passed straight
        // to Jotform's pagination, which would otherwise fail the run or resume from the wrong page.
        const parsedCheckpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        let offset = parsedCheckpoint.success ? parsedCheckpoint.data.offset : 0;

        const proxyConfig: ProxyConfiguration = {
            // https://api.jotform.com/docs/#user-forms
            endpoint: '/user/forms',
            // Jotform only exposes offset pagination here, so pin the walk to the
            // immutable form id ordering for the most stable resume behavior available.
            params: {
                orderby: 'id'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: offset,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'content'
            },
            retries: 3
        };

        for await (const page of nango.paginate<unknown>(proxyConfig)) {
            const parsed = z.array(ProviderFormSchema).safeParse(page);
            if (!parsed.success) {
                throw new Error(`Unexpected response shape from GET /user/forms: ${parsed.error.message}`);
            }

            const toSave: z.infer<typeof FormSchema>[] = [];
            const toDelete: { id: string }[] = [];

            for (const form of parsed.data) {
                if (form.status === 'DELETED') {
                    toDelete.push({ id: form.id });
                    continue;
                }

                toSave.push({
                    id: form.id,
                    ...(form.username != null && { username: form.username }),
                    ...(form.title != null && { title: form.title }),
                    ...(form.height != null && { height: form.height }),
                    ...(form.status != null && { status: form.status }),
                    ...(form.created_at != null && { created_at: form.created_at }),
                    ...(form.updated_at != null && { updated_at: form.updated_at }),
                    ...(form.last_submission != null && { last_submission: form.last_submission }),
                    ...(form.new != null && { new: form.new }),
                    ...(form.count != null && { count: form.count }),
                    ...(form.type != null && { type: form.type }),
                    ...(form.favorite != null && { favorite: form.favorite }),
                    ...(form.archived != null && { archived: form.archived }),
                    ...(form.url != null && { url: form.url })
                });
            }

            if (toSave.length > 0) {
                await nango.batchSave(toSave, 'Form');
            }

            if (toDelete.length > 0) {
                await nango.batchDelete(toDelete, 'Form');
            }

            // Persist pagination progress after every page so a run that exceeds the
            // execution window resumes at the next page instead of restarting at 0.
            offset += parsed.data.length;
            await nango.saveCheckpoint({ offset });
        }

        // The full walk completed, so the next run starts again from the first page.
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
