import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    title: z.string().describe('Title of the field being created. Example: "My Custom Field"'),
    type: z
        .enum(['dropdown', 'hidden', 'checkbox', 'date', 'text', 'datetime', 'textarea', 'listbox', 'radio', 'number'])
        .describe('Type of the custom field.'),
    descript: z.string().optional().describe('Description of field being created.'),
    perstag: z.string().optional().describe('The personalization tag that represents the field being created.'),
    defval: z.string().optional().describe('Default value of the field being created.'),
    visible: z.boolean().optional().describe('Show or hide this field when using the Form Builder.'),
    ordernum: z.number().int().optional().describe('Order of appearance in My Fields tab.')
});

const ProviderFieldSchema = z.object({
    title: z.string(),
    descript: z.string().nullable().optional(),
    type: z.string(),
    isrequired: z.string().optional(),
    perstag: z.string().nullable().optional(),
    defval: z.string().nullable().optional(),
    show_in_list: z.string().optional(),
    rows: z.string().optional(),
    cols: z.string().optional(),
    visible: z.string().optional(),
    service: z.string().optional(),
    ordernum: z.union([z.string(), z.number()]).optional(),
    cdate: z.string().optional(),
    udate: z.string().optional(),
    options: z.array(z.unknown()).optional(),
    relations: z.array(z.unknown()).optional(),
    links: z
        .object({
            options: z.string().optional(),
            relations: z.string().optional()
        })
        .optional(),
    id: z.string()
});

const ProviderResponseSchema = z.union([
    z.object({
        field: ProviderFieldSchema
    }),
    z.object({
        fieldOptions: z.array(z.unknown()).optional(),
        fieldRels: z.array(z.unknown()).optional(),
        fields: z.array(ProviderFieldSchema),
        meta: z
            .object({
                total: z.string().optional()
            })
            .optional()
    })
]);

const OutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    type: z.string(),
    descript: z.string().optional(),
    perstag: z.string().optional(),
    defval: z.string().optional(),
    visible: z.string().optional(),
    ordernum: z.union([z.string(), z.number()]).optional(),
    cdate: z.string().optional(),
    udate: z.string().optional()
});

const action = createAction({
    description: 'Create a contact custom field in ActiveCampaign.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-custom-field',
        group: 'Custom Fields'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.activecampaign.com/reference/create-a-contact-custom-field
            endpoint: '/3/fields',
            data: {
                field: {
                    title: input.title,
                    type: input.type,
                    ...(input.descript !== undefined && { descript: input.descript }),
                    ...(input.perstag !== undefined && { perstag: input.perstag }),
                    ...(input.defval !== undefined && { defval: input.defval }),
                    ...(input.visible !== undefined && { visible: input.visible ? 1 : 0 }),
                    ...(input.ordernum !== undefined && { ordernum: input.ordernum })
                }
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if ('field' in providerResponse) {
            const field = providerResponse.field;
            return {
                id: field.id,
                title: field.title,
                type: field.type,
                ...(field.descript != null && { descript: field.descript }),
                ...(field.perstag != null && { perstag: field.perstag }),
                ...(field.defval != null && { defval: field.defval }),
                ...(field.visible != null && { visible: field.visible }),
                ...(field.ordernum != null && { ordernum: field.ordernum }),
                ...(field.cdate != null && { cdate: field.cdate }),
                ...(field.udate != null && { udate: field.udate })
            };
        }

        const createdField = providerResponse.fields.find((f) => f.title === input.title);
        const field = createdField || providerResponse.fields[0];
        if (!field) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'No fields returned in the create response.'
            });
        }

        return {
            id: field.id,
            title: field.title,
            type: field.type,
            ...(field.descript != null && { descript: field.descript }),
            ...(field.perstag != null && { perstag: field.perstag }),
            ...(field.defval != null && { defval: field.defval }),
            ...(field.visible != null && { visible: field.visible }),
            ...(field.ordernum != null && { ordernum: field.ordernum }),
            ...(field.cdate != null && { cdate: field.cdate }),
            ...(field.udate != null && { udate: field.udate })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
