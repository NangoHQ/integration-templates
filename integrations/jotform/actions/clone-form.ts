import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        form_id: z.string().describe('ID of the Jotform form to clone. Example: "262715780901055"')
    })
    .describe('Input for cloning a Jotform form');

const JotformFormSchema = z.object({
    id: z.string(),
    title: z.string(),
    status: z.string().optional(),
    url: z.string().optional(),
    username: z.string().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    last_submission: z.string().nullable().optional(),
    count: z.number().optional(),
    new: z.number().optional(),
    height: z.string().optional()
});

const CloneFormResponseSchema = z.object({
    content: JotformFormSchema
});

const OutputSchema = z
    .object({
        id: z.string().describe('ID of the newly created clone form. Example: "262735631157055"'),
        title: z.string().describe('Title of the cloned form. Jotform automatically prefixes the original form title with "Clone of "'),
        status: z.string().optional().describe('Status of the cloned form. Example: "ENABLED"'),
        url: z.string().optional().describe('URL of the cloned form. Example: "https://form.jotform.com/262735631157055"'),
        username: z.string().optional().describe('Username of the Jotform account that owns the cloned form'),
        created_at: z
            .string()
            .optional()
            .describe('Creation timestamp of the cloned form. Example: "2026-10-01 12:00:00". Omitted when null in the provider response'),
        updated_at: z.string().optional().describe('Timestamp of the last update to the cloned form. Omitted when the form has never been updated'),
        last_submission: z
            .string()
            .optional()
            .describe('Timestamp of the most recent submission to the cloned form. Omitted when the clone has no submissions yet'),
        count: z.number().optional().describe('Total number of submissions on the cloned form. Example: 0'),
        new: z.number().optional().describe('Number of unread submissions on the cloned form. Example: 0'),
        height: z.string().optional().describe('Height of the cloned form in pixels, as a string. Example: "600"')
    })
    .describe('The newly created clone of the source form');

/**
 * @tags: [write]
 * @tagReason: Creates a new form on the provider by cloning an existing form; the source form is only read server-side.
 * @pitfalls: The cloned form's title is automatically set to "Clone of <original title>" and cannot be customized in this call. The clone carries over the form's structure but not its submissions, so the new form starts with zero submissions.
 */
const action = createAction({
    description: 'Duplicate an existing form, including its questions/structure, as a new form.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://api.jotform.com/docs/#post-form-id-clone
            endpoint: `/form/${encodeURIComponent(input.form_id)}/clone`,
            // Cloning is a create-style POST with no idempotency key; a retry after a lost response would create duplicate forms, so retries are disabled.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };
        const response = await nango.post(config);

        const parsed = CloneFormResponseSchema.parse(response.data);
        const form = parsed.content;

        return {
            id: form.id,
            title: form.title,
            ...(form.status !== undefined && { status: form.status }),
            ...(form.url !== undefined && { url: form.url }),
            ...(form.username !== undefined && { username: form.username }),
            ...(form.created_at != null && { created_at: form.created_at }),
            ...(form.updated_at != null && { updated_at: form.updated_at }),
            ...(form.last_submission != null && { last_submission: form.last_submission }),
            ...(form.count !== undefined && { count: form.count }),
            ...(form.new !== undefined && { new: form.new }),
            ...(form.height !== undefined && { height: form.height })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
