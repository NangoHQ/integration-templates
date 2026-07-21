import { z } from 'zod';
import { createAction } from 'nango';

const TemplateContentSchema = z.object({
    name: z.string().describe('Name of the mc:edit editable region to inject into. Example: "editable"'),
    content: z.string().describe('Content to inject into the editable region. Example: "content"')
});

const MergeVarSchema = z.object({
    name: z.string().describe('Merge variable name. Example: "merge1"'),
    content: z.string().describe('Content value for the merge variable. Example: "merge1 content"')
});

const InputSchema = z.object({
    template_name: z.string().describe('Immutable name or slug of a template that exists in the user\'s account. Example: "example-template"'),
    template_content: z.array(TemplateContentSchema).describe('Array of template content to render for editable regions.'),
    merge_vars: z.array(MergeVarSchema).nullish().describe('Optional merge variables to use for injecting merge field content.')
});

const ProviderResponseSchema = z.object({
    html: z.string().describe('Rendered HTML as a string with content and merge variables injected.')
});

const OutputSchema = z.object({
    html: z.string().describe('Rendered HTML as a string with content and merge variables injected.')
});

const action = createAction({
    description: 'Inject content and merge variables into a template and return the rendered HTML, without sending it.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/templates/render-html-template/
            endpoint: '1.0/templates/render.json',
            data: {
                template_name: input.template_name,
                template_content: input.template_content,
                ...(input.merge_vars !== undefined && { merge_vars: input.merge_vars })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            html: providerResponse.html
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
