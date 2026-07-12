import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderUserSchema = z.object({
    id: z.number(),
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
    locale: z.string().optional()
});

const ProviderCompanySchema = z.object({
    id: z.number(),
    name: z.string(),
    reg_no: z.string().optional()
});

const ProviderMeSchema = z.object({
    user: ProviderUserSchema,
    company: ProviderCompanySchema
});

const OutputSchema = z.object({
    user: z.object({
        id: z.number(),
        first_name: z.string(),
        last_name: z.string(),
        email: z.string(),
        locale: z.string().optional()
    }),
    company: z.object({
        id: z.number(),
        name: z.string(),
        reg_no: z.string().optional()
    })
});

const action = createAction({
    description: 'Retrieve the Pennylane company and user associated with the token.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getme
            endpoint: '/api/external/v2/me',
            retries: 3
        });

        const me = ProviderMeSchema.parse(response.data);

        return {
            user: {
                id: me.user.id,
                first_name: me.user.first_name,
                last_name: me.user.last_name,
                email: me.user.email,
                ...(me.user.locale !== undefined && { locale: me.user.locale })
            },
            company: {
                id: me.company.id,
                name: me.company.name,
                ...(me.company.reg_no !== undefined && { reg_no: me.company.reg_no })
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
