import { z } from 'zod';
import { createAction } from 'nango';

const HrefObjectSchema = z.object({
    href: z.string()
});

const FieldSchema = z
    .object({
        ref: z.string(),
        title: z.string(),
        type: z.string()
    })
    .passthrough();

const InputSchema = z.object({
    title: z.string().describe('Title to use for the form. Example: "My new form"'),
    fields: z.array(FieldSchema).describe('Array of field objects to use in the form. Each field must include type, title, and ref.'),
    workspace: HrefObjectSchema.optional().describe('Workspace to place the form in. Pass the full https://api.typeform.com/workspaces/{id} URL in href.'),
    theme: HrefObjectSchema.optional().describe('Theme to use for the form. Pass the full https://api.typeform.com/themes/{id} URL in href.'),
    settings: z.record(z.string(), z.unknown()).optional().describe('Form settings and metadata.'),
    thankyou_screens: z.array(z.record(z.string(), z.unknown())).optional().describe('Array of thank you screen objects.'),
    welcome_screens: z.array(z.record(z.string(), z.unknown())).optional().describe('Array of welcome screen objects.')
});

const FormSchema = z
    .object({
        id: z.string(),
        title: z.string(),
        type: z.string().optional(),
        language: z.string().optional(),
        fields: z.array(z.record(z.string(), z.unknown())).optional(),
        hidden: z.array(z.string()).optional(),
        welcome_screens: z.array(z.record(z.string(), z.unknown())).optional(),
        thankyou_screens: z.array(z.record(z.string(), z.unknown())).optional(),
        settings: z.record(z.string(), z.unknown()).optional(),
        theme: HrefObjectSchema.optional(),
        workspace: HrefObjectSchema.optional(),
        _links: z.record(z.string(), z.unknown()).optional(),
        logic: z.array(z.unknown()).optional(),
        variables: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Create a form.',
    version: '1.0.0',
    input: InputSchema,
    output: FormSchema,

    exec: async (nango, input): Promise<z.infer<typeof FormSchema>> => {
        const response = await nango.post({
            // https://www.typeform.com/developers/create/reference/create-form/
            endpoint: '/forms',
            data: {
                title: input.title,
                fields: input.fields,
                ...(input.workspace !== undefined && { workspace: input.workspace }),
                ...(input.theme !== undefined && { theme: input.theme }),
                ...(input.settings !== undefined && { settings: input.settings }),
                ...(input.thankyou_screens !== undefined && { thankyou_screens: input.thankyou_screens }),
                ...(input.welcome_screens !== undefined && { welcome_screens: input.welcome_screens })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'creation_failed',
                message: 'Form creation failed with an empty response.'
            });
        }

        const form = FormSchema.parse(response.data);
        return form;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
