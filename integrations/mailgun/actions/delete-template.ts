import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        domain: z.string().describe('The Mailgun domain that owns the template. Example: "mg.example.com"'),
        name: z.string().describe('The name of the template to delete. Example: "welcome-email"')
    })
    .describe('Input for deleting a Mailgun template.');

const OutputSchema = z
    .object({
        message: z.string().describe('Confirmation message returned by Mailgun for the deletion.'),
        template: z
            .object({
                name: z.string().describe('The name of the template that was deleted.')
            })
            .describe('The template that was deleted.')
    })
    .describe('Confirmation of the deleted Mailgun template.');

const DeleteTemplateResponseSchema = z.object({
    message: z.string(),
    template: z.object({
        name: z.string()
    })
});

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a Mailgun template and all of its versions from the provider.
 * @pitfalls: Deletion is permanent and cannot be undone; the template and every one of its versions are removed together, not just the active one.
 */
const action = createAction({
    description: 'Delete a template and all its versions.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://documentation.mailgun.com/ (DELETE /v3/{domain}/templates/{name})
            endpoint: `/v3/${encodeURIComponent(input.domain)}/templates/${encodeURIComponent(input.name)}`,
            // Not idempotent: retrying after a lost-but-successful delete would 404 and mask the original success.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };
        const response = await nango.delete(config);

        const deleted = DeleteTemplateResponseSchema.parse(response.data);

        return {
            message: deleted.message,
            template: {
                name: deleted.template.name
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
