import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    form_id: z.string().describe('Form ID. Example: "WMpBq4vc"'),
    title: z.string().optional().describe('New form title.')
});

const ProviderFormSchema = z
    .object({
        id: z.string(),
        title: z.string(),
        type: z.string().optional(),
        workspace: z
            .object({
                href: z.string().optional()
            })
            .optional(),
        settings: z.record(z.string(), z.unknown()).optional(),
        fields: z.array(z.unknown()).optional(),
        thankyou_screens: z.array(z.unknown()).optional(),
        theme: z
            .object({
                href: z.string().optional()
            })
            .optional(),
        logic: z.array(z.unknown()).optional(),
        variables: z.record(z.string(), z.unknown()).optional(),
        links: z.record(z.string(), z.unknown()).optional(),
        self: z.record(z.string(), z.unknown()).optional(),
        _links: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    type: z.string().optional(),
    workspace: z
        .object({
            href: z.string().optional()
        })
        .optional(),
    settings: z.record(z.string(), z.unknown()).optional(),
    fields: z.array(z.unknown()).optional(),
    thankyou_screens: z.array(z.unknown()).optional(),
    theme: z
        .object({
            href: z.string().optional()
        })
        .optional(),
    logic: z.array(z.unknown()).optional(),
    variables: z.record(z.string(), z.unknown()).optional(),
    links: z.record(z.string(), z.unknown()).optional(),
    self: z.record(z.string(), z.unknown()).optional(),
    _links: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Fully replace a form (whole-definition update).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['forms:read', 'forms:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.typeform.com/developers/create/
        const getResponse = await nango.get({
            endpoint: `/forms/${encodeURIComponent(input.form_id)}`,
            retries: 3
        });

        if (!getResponse.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Form not found',
                form_id: input.form_id
            });
        }

        const currentForm = ProviderFormSchema.parse(getResponse.data);
        const updatedForm = { ...currentForm };

        if (input.title !== undefined) {
            updatedForm.title = input.title;
        }

        // https://www.typeform.com/developers/create/
        const putResponse = await nango.put({
            endpoint: `/forms/${encodeURIComponent(input.form_id)}`,
            data: updatedForm,
            retries: 1
        });

        if (!putResponse.data) {
            throw new nango.ActionError({
                type: 'unexpected_error',
                message: 'Form update failed with no response data',
                form_id: input.form_id
            });
        }

        const result = ProviderFormSchema.parse(putResponse.data);

        return {
            id: result.id,
            title: result.title,
            ...(result.type !== undefined && { type: result.type }),
            ...(result.workspace !== undefined && { workspace: result.workspace }),
            ...(result.settings !== undefined && { settings: result.settings }),
            ...(result.fields !== undefined && { fields: result.fields }),
            ...(result.thankyou_screens !== undefined && { thankyou_screens: result.thankyou_screens }),
            ...(result.theme !== undefined && { theme: result.theme }),
            ...(result.logic !== undefined && { logic: result.logic }),
            ...(result.variables !== undefined && { variables: result.variables }),
            ...(result.links !== undefined && { links: result.links }),
            ...(result.self !== undefined && { self: result.self }),
            ...(result._links !== undefined && { _links: result._links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
