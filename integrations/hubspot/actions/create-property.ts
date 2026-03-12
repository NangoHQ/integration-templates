import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    object_type: z
        .enum(['contacts', 'companies', 'deals', 'products', 'tickets', 'line_items'])
        .describe('The CRM object type for which the property will be created. Example: "contacts"'),
    name: z.string().describe('The internal name of the property (lowercase, alphanumeric and underscores only). Example: "favorite_food"'),
    label: z.string().describe('The display name of the property as shown in HubSpot. Example: "Favorite Food"'),
    type: z.enum(['string', 'number', 'bool', 'enumeration', 'datetime', 'date', 'phone_number']).describe('The data type of the property. Example: "string"'),
    field_type: z
        .enum([
            'text',
            'textarea',
            'number',
            'date',
            'select',
            'checkbox',
            'radio',
            'booleancheckbox',
            'file',
            'calculation_equation',
            'calculation_rollup',
            'calculation_score',
            'calculation_date'
        ])
        .describe('The field type determines the input widget shown in HubSpot. Example: "text"'),
    group_name: z.string().optional().describe('The property group the property belongs to. Defaults to "contactinformation". Example: "contactinformation"'),
    description: z.string().optional().describe('A description of the property. Example: "The users favorite food"'),
    display_order: z.number().int().optional().describe('The order the property appears in its group. Example: 1'),
    options: z
        .array(
            z.object({
                label: z.string(),
                value: z.string(),
                display_order: z.number().int().optional(),
                hidden: z.boolean().optional()
            })
        )
        .optional()
        .describe('Required for enumeration field types (select, checkbox, radio). Array of option objects with label and value.')
});

const OutputSchema = z.object({
    name: z.string(),
    label: z.string(),
    type: z.string(),
    field_type: z.string(),
    group_name: z.string(),
    description: z.union([z.string(), z.null()]),
    display_order: z.union([z.number(), z.null()]),
    created_at: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()]),
    archived: z.boolean(),
    archived_at: z.union([z.string(), z.null()]),
    options: z
        .array(
            z.object({
                label: z.string(),
                value: z.string(),
                display_order: z.union([z.number(), z.null()]),
                hidden: z.boolean()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Create a custom CRM property for a specified HubSpot object type',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/create-property',
        group: 'Properties'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['crm.objects.contacts.write', 'crm.objects.companies.write', 'crm.objects.deals.write', 'crm.schemas.custom.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.hubspot.com/docs/api-reference/crm-properties-v3/properties/post-crm-v3-properties-objectType
        const response = await nango.post({
            endpoint: `/crm/v3/properties/${input.object_type}`,
            data: {
                name: input.name,
                label: input.label,
                type: input.type,
                fieldType: input.field_type,
                groupName: input.group_name ?? 'contactinformation',
                ...(input.description && { description: input.description }),
                ...(input.display_order !== undefined && { displayOrder: input.display_order }),
                ...(input.options &&
                    input.options.length > 0 && {
                        options: input.options.map((opt) => ({
                            label: opt.label,
                            value: opt.value,
                            ...(opt.display_order !== undefined && { displayOrder: opt.display_order }),
                            ...(opt.hidden !== undefined && { hidden: opt.hidden })
                        }))
                    })
            },
            retries: 10
        });

        const data = response.data;

        return {
            name: data.name,
            label: data.label,
            type: data.type,
            field_type: data.fieldType,
            group_name: data.groupName,
            description: data.description ?? null,
            display_order: data.displayOrder ?? null,
            created_at: data.createdAt ?? null,
            updated_at: data.updatedAt ?? null,
            archived: data.archived ?? false,
            archived_at: data.archivedAt ?? null,
            ...(data.options &&
                data.options.length > 0 && {
                    options: data.options.map((opt: { label: string; value: string; displayOrder?: number; hidden?: boolean }) => ({
                        label: opt.label,
                        value: opt.value,
                        display_order: opt.displayOrder ?? null,
                        hidden: opt.hidden ?? false
                    }))
                })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
