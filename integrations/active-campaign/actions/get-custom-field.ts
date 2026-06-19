import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Custom field ID. Example: "1"')
});

const ProviderFieldOptionSchema = z.object({
    field: z.string(),
    orderid: z.string(),
    value: z.string(),
    label: z.string(),
    isdefault: z.string(),
    cdate: z.string().nullable().optional(),
    udate: z.string().nullable().optional(),
    links: z.unknown().optional(),
    id: z.string()
});

const ProviderFieldRelSchema = z.object({
    field: z.string(),
    relid: z.string(),
    dorder: z.string(),
    cdate: z.string().optional(),
    links: z.unknown().optional(),
    id: z.string()
});

const ProviderFieldSchema = z.object({
    title: z.string(),
    descript: z.string().nullable().optional(),
    type: z.string(),
    isrequired: z.string(),
    perstag: z.string(),
    defval: z.string().nullable().optional(),
    show_in_list: z.string(),
    rows: z.string(),
    cols: z.string(),
    visible: z.string(),
    service: z.string(),
    ordernum: z.string(),
    cdate: z.string(),
    udate: z.string(),
    created_timestamp: z.string().optional(),
    updated_timestamp: z.string().optional(),
    created_by: z.string().optional(),
    updated_by: z.string().optional(),
    options: z.array(z.string()).optional(),
    relations: z.array(z.string()).optional(),
    links: z
        .object({
            options: z.string().optional(),
            relations: z.string().optional()
        })
        .optional(),
    id: z.string()
});

const ProviderResponseSchema = z.object({
    field: ProviderFieldSchema,
    fieldOptions: z.array(ProviderFieldOptionSchema).optional(),
    fieldRels: z.array(ProviderFieldRelSchema).optional()
});

const FieldOptionSchema = z.object({
    field: z.string(),
    orderid: z.string(),
    value: z.string(),
    label: z.string(),
    isdefault: z.string(),
    cdate: z.string().optional(),
    udate: z.string().optional(),
    links: z.unknown().optional(),
    id: z.string()
});

const FieldRelSchema = z.object({
    field: z.string(),
    relid: z.string(),
    dorder: z.string(),
    cdate: z.string().optional(),
    links: z.unknown().optional(),
    id: z.string()
});

const FieldSchema = z.object({
    title: z.string(),
    descript: z.string().optional(),
    type: z.string(),
    isrequired: z.string(),
    perstag: z.string(),
    defval: z.string().optional(),
    show_in_list: z.string(),
    rows: z.string(),
    cols: z.string(),
    visible: z.string(),
    service: z.string(),
    ordernum: z.string(),
    cdate: z.string(),
    udate: z.string(),
    created_timestamp: z.string().optional(),
    updated_timestamp: z.string().optional(),
    created_by: z.string().optional(),
    updated_by: z.string().optional(),
    options: z.array(z.string()).optional(),
    relations: z.array(z.string()).optional(),
    links: z
        .object({
            options: z.string().optional(),
            relations: z.string().optional()
        })
        .optional(),
    id: z.string()
});

const OutputSchema = z.object({
    field: FieldSchema,
    fieldOptions: z.array(FieldOptionSchema).optional(),
    fieldRels: z.array(FieldRelSchema).optional()
});

const action = createAction({
    description: 'Retrieve a single contact custom field from ActiveCampaign.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.activecampaign.com/reference/retrieve-a-custom-field-contact
            endpoint: `/3/fields/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Custom field not found',
                id: input.id
            });
        }

        const provider = ProviderResponseSchema.parse(response.data);
        const field = provider.field;

        return {
            field: {
                id: field.id,
                title: field.title,
                type: field.type,
                isrequired: field.isrequired,
                perstag: field.perstag,
                show_in_list: field.show_in_list,
                rows: field.rows,
                cols: field.cols,
                visible: field.visible,
                service: field.service,
                ordernum: field.ordernum,
                cdate: field.cdate,
                udate: field.udate,
                ...(field.descript !== null && field.descript !== undefined && { descript: field.descript }),
                ...(field.defval !== null && field.defval !== undefined && { defval: field.defval }),
                ...(field.created_timestamp !== undefined && { created_timestamp: field.created_timestamp }),
                ...(field.updated_timestamp !== undefined && { updated_timestamp: field.updated_timestamp }),
                ...(field.created_by !== undefined && { created_by: field.created_by }),
                ...(field.updated_by !== undefined && { updated_by: field.updated_by }),
                ...(field.options !== undefined && { options: field.options }),
                ...(field.relations !== undefined && { relations: field.relations }),
                ...(field.links !== undefined && { links: field.links })
            },
            ...(provider.fieldOptions !== undefined && {
                fieldOptions: provider.fieldOptions.map((opt) => ({
                    field: opt.field,
                    orderid: opt.orderid,
                    value: opt.value,
                    label: opt.label,
                    isdefault: opt.isdefault,
                    id: opt.id,
                    ...(opt.cdate !== null && opt.cdate !== undefined && { cdate: opt.cdate }),
                    ...(opt.udate !== null && opt.udate !== undefined && { udate: opt.udate }),
                    ...(opt.links !== undefined && { links: opt.links })
                }))
            }),
            ...(provider.fieldRels !== undefined && {
                fieldRels: provider.fieldRels.map((rel) => ({
                    field: rel.field,
                    relid: rel.relid,
                    dorder: rel.dorder,
                    id: rel.id,
                    ...(rel.cdate !== undefined && { cdate: rel.cdate }),
                    ...(rel.links !== undefined && { links: rel.links })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
