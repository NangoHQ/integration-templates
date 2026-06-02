import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('ID of the form to retrieve. Example: "13"')
});

const FormActionSchema = z
    .object({
        type: z.string().optional(),
        email: z.string().optional(),
        fromname: z.string().optional(),
        fromemail: z.string().optional(),
        subject: z.string().optional()
    })
    .passthrough();

const FormActionDataSchema = z
    .object({
        actions: z.array(FormActionSchema).optional()
    })
    .passthrough();

const FormSubmitDataSchema = z
    .object({
        url: z.string().optional()
    })
    .passthrough();

const FormBorderSchema = z
    .object({
        width: z.number().optional(),
        style: z.string().optional(),
        color: z.string().optional(),
        radius: z.number().optional()
    })
    .passthrough();

const FormButtonStyleSchema = z
    .object({
        padding: z.number().optional(),
        background: z.string().optional(),
        fontcolor: z.string().optional(),
        border: FormBorderSchema.optional()
    })
    .passthrough();

const FormStyleSchema = z
    .object({
        background: z.string().optional(),
        dark: z.boolean().optional(),
        fontcolor: z.string().optional(),
        layout: z.string().optional(),
        border: FormBorderSchema.optional(),
        width: z.number().optional(),
        ac_branding: z.boolean().optional(),
        button: FormButtonStyleSchema.optional(),
        customcss: z.string().optional()
    })
    .passthrough();

const FormOptionsSchema = z
    .object({
        blanks_overwrite: z.boolean().optional(),
        confaction: z.string().optional()
    })
    .passthrough();

const FormFieldSchema = z.object({}).passthrough();

const FormLinksSchema = z
    .object({
        address: z.string().optional()
    })
    .passthrough();

const FormSchema = z
    .object({
        id: z.string(),
        name: z.string().nullish(),
        action: z.string().nullish(),
        actiondata: FormActionDataSchema.nullish(),
        submit: z.string().nullish(),
        submitdata: FormSubmitDataSchema.nullish(),
        url: z.string().nullish(),
        layout: z.string().nullish(),
        title: z.string().nullish(),
        body: z.string().nullish(),
        button: z.string().nullish(),
        thanks: z.string().nullish(),
        style: FormStyleSchema.nullish(),
        options: FormOptionsSchema.nullish(),
        cfields: z.array(FormFieldSchema).nullish(),
        parentformid: z.string().nullish(),
        userid: z.string().nullish(),
        addressid: z.string().nullish(),
        cdate: z.string().nullish(),
        udate: z.string().nullish(),
        entries: z.string().nullish(),
        aid: z.unknown().nullish(),
        links: FormLinksSchema.nullish(),
        address: z.unknown().nullish()
    })
    .passthrough();

const OutputSchema = FormSchema;

const action = createAction({
    description: 'Retrieve a single form from ActiveCampaign.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-form',
        group: 'Forms'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.activecampaign.com/reference/retrieve-forms
            endpoint: `/3/forms/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const providerResponse = z
            .object({
                form: FormSchema
            })
            .parse(response.data);

        return providerResponse.form;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
