import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        domain: z.string().describe('Domain the template belongs to. Example: "mg.example.com"'),
        name: z.string().describe('Current name of the template to update. Example: "welcome-email"'),
        description: z.string().optional().describe('New description for the template. Example: "Welcome email for new signups"'),
        new_name: z.string().optional().describe('New name for the template. When provided, the template is renamed. Example: "welcome-email-v2"')
    })
    .describe("Input for updating a Mailgun template's metadata. Provide at least one of description or new_name.");

const OutputSchema = z
    .object({
        name: z.string().describe('Name of the template after the update. Differs from the input name when new_name was provided.'),
        message: z.string().describe('Confirmation message returned by Mailgun, e.g. "template has been updated" or "Template has been renamed".')
    })
    .describe('Result of the template metadata update.');

const ProviderTemplateResponseSchema = z.object({
    message: z.string(),
    template: z.object({
        name: z.string()
    })
});

/**
 * @tags: [write]
 * @tagReason: Mutates a template's description and/or name via Mailgun PUT calls.
 * @pitfalls: Updates template metadata only; the template body/content is versioned separately and is not changed here. The response echoes only the template name, not the updated description. Renaming fails if another template in the domain already uses the new name.
 */
const action = createAction({
    description: "Update a template's metadata (description and/or name).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.description === undefined && input.new_name === undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Provide at least one of description or new_name.'
            });
        }

        const domainSegment = encodeURIComponent(input.domain);
        let currentName = input.name;
        let message = '';

        if (input.description !== undefined) {
            const updateConfig: ProxyConfiguration = {
                // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/domain-templates/put-v3--domain-name--templates--template-name-
                endpoint: `/v3/${domainSegment}/templates/${encodeURIComponent(currentName)}`,
                // Mailgun requires form-encoded parameters; sending them as query params sidesteps the Nango proxy body-serialization issue.
                params: {
                    description: input.description
                },
                retries: 3
            };
            const response = await nango.put(updateConfig);
            const parsed = ProviderTemplateResponseSchema.parse(response.data);
            message = parsed.message;
            currentName = parsed.template.name;
        }

        if (input.new_name !== undefined) {
            const renameConfig: ProxyConfiguration = {
                // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/domain-templates/put-v3--domain-name--templates--template-name--rename--new-template-name-
                endpoint: `/v3/${domainSegment}/templates/${encodeURIComponent(currentName)}/rename/${encodeURIComponent(input.new_name)}`,
                // Not idempotent: a retry after a lost response would 404 because the old name no longer exists.
                // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- deliberate retries: 0 for the non-idempotent rename above
                retries: 0
            };
            const response = await nango.put(renameConfig);
            const parsed = ProviderTemplateResponseSchema.parse(response.data);
            message = parsed.message;
            currentName = parsed.template.name;
        }

        return {
            name: currentName,
            message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
