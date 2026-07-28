import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    from: z.number().optional().describe('Start index for pagination. Example: 0'),
    count: z.number().optional().describe('Number of elements to return. Example: 100')
});

const EmployeeSchema = z
    .object({
        id: z.number(),
        version: z.number().optional(),
        firstName: z.string().nullish(),
        lastName: z.string().nullish(),
        displayName: z.string().nullable(),
        employeeNumber: z.string().nullable(),
        email: z.string().nullable(),
        phoneNumberMobile: z.string().nullable(),
        userType: z.string().nullable(),
        isContact: z.boolean().nullable()
    })
    .passthrough();

const OutputSchema = z.object({
    fullResultSize: z.number(),
    from: z.number(),
    count: z.number(),
    values: z.array(EmployeeSchema)
});

const action = createAction({
    description: 'List employees.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
            endpoint: 'v2/employee',
            params: {
                ...(input.from !== undefined && { from: input.from }),
                ...(input.count !== undefined && { count: input.count })
            },
            retries: 3
        });

        const listResponse = z
            .object({
                fullResultSize: z.number(),
                from: z.number(),
                count: z.number(),
                versionDigest: z.string().optional(),
                values: z.array(z.unknown())
            })
            .parse(response.data);

        return {
            fullResultSize: listResponse.fullResultSize,
            from: listResponse.from,
            count: listResponse.count,
            values: listResponse.values.map((item) => EmployeeSchema.parse(item))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
