import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const CompanySchema = z.object({
    name: z.string(),
    users_count: z.number(),
    numbers_count: z.number()
});

const ProviderResponseSchema = z.object({
    company: CompanySchema
});

const OutputSchema = z.object({
    company: z.object({
        name: z.string(),
        users_count: z.number(),
        numbers_count: z.number()
    })
});

const action = createAction({
    description: 'Retrieve the Aircall company/account information.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.aircall.io/api-references/
            endpoint: '/v1/company',
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            company: {
                name: parsed.company.name,
                users_count: parsed.company.users_count,
                numbers_count: parsed.company.numbers_count
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
