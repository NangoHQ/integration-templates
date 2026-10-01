import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        title: z.string().optional().describe('Title for the new form. Example: "Contact Us". If omitted, Jotform assigns its generic placeholder title.')
    })
    .describe('Input for creating a new Jotform form.');

const CreatedFormSchema = z.object({
    id: z.string(),
    username: z.string().optional(),
    title: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    height: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

const CreateFormResponseSchema = z.object({
    responseCode: z.number(),
    message: z.string().optional(),
    content: CreatedFormSchema
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique ID of the newly created form. Example: "262735255518563"'),
        title: z
            .string()
            .optional()
            .describe('The title of the created form. If no title was provided, Jotform assigns its generic placeholder title ("Title Me").'),
        url: z.string().optional().describe('The public URL of the created form. Example: "https://form.jotform.com/262735255518563"')
    })
    .describe('The newly created Jotform form.');

/**
 * @tags: [write]
 * @tagReason: Creates a new form on the Jotform account.
 * @pitfalls: Requires a Jotform API key with Full Access; a Read Access key fails with an authorization error on this action even though read actions succeed with the same key. If no title is provided, Jotform assigns the generic placeholder title "Title Me". The form is created with no fields; questions must be added in a separate call after creation.
 */
const action = createAction({
    description: 'Create a new, empty Jotform form, optionally setting its title at creation time.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://api.jotform.com/docs/ (POST /form)
            endpoint: '/form',
            // Jotform silently ignores body parameters on this endpoint, so the title must be sent as a query-string parameter.
            params: {
                ...(input.title !== undefined && { 'properties[title]': input.title })
            },
            // Not idempotent: retrying a create after a lost response would create duplicate forms.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };

        const response = await nango.post(config);

        const parsed = CreateFormResponseSchema.parse(response.data);

        if (parsed.responseCode !== 200) {
            throw new nango.ActionError({
                type: 'create_form_failed',
                message: `Jotform failed to create the form: ${parsed.message ?? 'unknown error'}`,
                responseCode: parsed.responseCode
            });
        }

        return {
            id: parsed.content.id,
            ...(parsed.content.title != null && { title: parsed.content.title }),
            ...(parsed.content.url != null && { url: parsed.content.url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
