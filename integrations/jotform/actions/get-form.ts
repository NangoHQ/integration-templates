import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        form_id: z.string().describe('The unique identifier of the form to retrieve. Example: "262715780901055"')
    })
    .describe('Input for retrieving a single Jotform form');

const FormContentSchema = z.object({
    id: z.string(),
    title: z.string(),
    status: z.string(),
    url: z.string(),
    count: z.string().regex(/^\d+$/),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    last_submission: z.string().nullable().optional()
});

const GetFormResponseSchema = z.object({
    content: FormContentSchema
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the form. Example: "262715780901055"'),
        title: z.string().describe('The title of the form. Example: "Feature Showcase Form"'),
        status: z.string().describe('The status of the form, e.g. "ENABLED", "DISABLED" or "DELETED". Example: "ENABLED"'),
        url: z.string().describe('The public URL of the form. Example: "https://form.jotform.com/262715780901055"'),
        count: z.number().describe('The total number of submissions the form has received. Example: 42'),
        created_at: z.string().optional().describe('The date and time the form was created, in "YYYY-MM-DD HH:mm:ss" format. Example: "2026-09-29 14:56:35"'),
        updated_at: z
            .string()
            .optional()
            .describe('The date and time the form was last updated, in "YYYY-MM-DD HH:mm:ss" format. Example: "2026-09-29 14:59:19"'),
        last_submission: z
            .string()
            .optional()
            .describe(
                'The date and time of the most recent submission, in "YYYY-MM-DD HH:mm:ss" format. Omitted when the form has no submissions. Example: "2026-10-01 13:32:51"'
            )
    })
    .describe('Metadata for a single Jotform form');

/**
 * @tags: [read]
 * @tagReason: Makes a single read-only GET request to Jotform to fetch form metadata; it creates, modifies, and deletes nothing in the provider account.
 * @pitfalls: A deleted form still returns successfully with status "DELETED" instead of a not-found error, so check the status field rather than relying on an error to detect removed forms.
 */
const action = createAction({
    description: "Retrieve a single form's metadata (title, status, URL, submission count, timestamps)",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://api.jotform.com/docs/#form-id
            endpoint: `/form/${encodeURIComponent(input.form_id)}`,
            retries: 3
        };
        const response = await nango.get(config);

        const form = GetFormResponseSchema.parse(response.data).content;

        return {
            id: form.id,
            title: form.title,
            status: form.status,
            url: form.url,
            count: Number.parseInt(form.count, 10),
            ...(form.created_at != null && { created_at: form.created_at }),
            ...(form.updated_at != null && { updated_at: form.updated_at }),
            ...(form.last_submission != null && { last_submission: form.last_submission })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
