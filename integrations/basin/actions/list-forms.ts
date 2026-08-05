import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page: z.number().optional().describe('Page number for pagination. Defaults to 1.'),
    query: z.string().optional().describe('Search query filtering by id, name, uuid, or project_id.')
});

const MetaSchema = z.object({
    count: z.number(),
    page: z.number(),
    per_page: z.number()
});

const FormSchema = z
    .object({
        id: z.number(),
        name: z.string(),
        uuid: z.string(),
        project_id: z.number().nullable().optional(),
        redirect_url: z.string().nullable().optional(),
        redirect_enabled: z.boolean().nullable().optional(),
        webhooks: z
            .array(
                z
                    .object({
                        url: z.string(),
                        enabled: z.boolean().nullable().optional(),
                        trigger_when_spam: z.boolean().nullable().optional()
                    })
                    .passthrough()
            )
            .nullable()
            .optional(),
        honeypot_enabled: z.boolean().nullable().optional(),
        spam_filter_enabled: z.boolean().nullable().optional(),
        send_as_json: z.boolean().nullable().optional(),
        created_at: z.string().nullable().optional(),
        updated_at: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    forms: z.array(FormSchema),
    meta: MetaSchema,
    next_page: z.number().optional().describe('Next page number if more results are available.')
});

const action = createAction({
    description: 'List forms in this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.usebasin.com/developer-features/api-reference/
        const response = await nango.get({
            endpoint: 'v1/forms',
            params: {
                ...(input.page !== undefined && { page: String(input.page) }),
                ...(input.query !== undefined && { query: input.query })
            },
            retries: 3
        });

        const data = z
            .object({
                forms: z.array(z.unknown()),
                meta: z.unknown()
            })
            .parse(response.data);

        const meta = MetaSchema.parse(data.meta);
        const forms = data.forms.map((item: unknown) => FormSchema.parse(item));

        return {
            forms,
            meta,
            ...(meta.page * meta.per_page < meta.count && { next_page: meta.page + 1 })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
