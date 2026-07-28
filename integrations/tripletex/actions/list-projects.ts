import { z } from 'zod';
import { createAction } from 'nango';

function opt<T extends z.ZodTypeAny>(schema: T) {
    return z.preprocess((val) => (val === null ? undefined : val), schema.optional());
}

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const EmployeeSchema = z.object({
    id: z.number(),
    firstName: opt(z.string()),
    lastName: opt(z.string()),
    displayName: opt(z.string())
});

const DepartmentSchema = z.object({
    id: z.number(),
    name: opt(z.string()),
    displayName: opt(z.string())
});

const CustomerSchema = z.object({
    id: z.number(),
    name: opt(z.string()),
    displayName: opt(z.string())
});

const MainProjectSchema = z.object({
    id: z.number(),
    name: opt(z.string()),
    number: opt(z.string())
});

const ProjectSchema = z.object({
    id: z.number(),
    version: opt(z.number()),
    name: opt(z.string()),
    number: opt(z.string()),
    displayName: opt(z.string()),
    description: opt(z.string()),
    startDate: opt(z.string()),
    endDate: opt(z.string()),
    isClosed: opt(z.boolean()),
    isInternal: opt(z.boolean()),
    isOffer: opt(z.boolean()),
    isFixedPrice: opt(z.boolean()),
    reference: opt(z.string()),
    externalAccountsNumber: opt(z.string()),
    projectManager: opt(EmployeeSchema),
    department: opt(DepartmentSchema),
    customer: opt(CustomerSchema),
    mainProject: opt(MainProjectSchema)
});

const OutputSchema = z.object({
    items: z.array(ProjectSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List projects.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const from = input.cursor ? Number(input.cursor) : 0;
        if (Number.isNaN(from)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid number'
            });
        }

        // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
        const response = await nango.get({
            endpoint: 'v2/project',
            params: {
                from: String(from),
                count: '100'
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Tripletex API'
            });
        }

        const listResponse = z
            .object({
                fullResultSize: z.number().optional(),
                from: z.number().optional(),
                count: z.number().optional(),
                values: z.array(z.unknown()).optional()
            })
            .parse(response.data);

        const items = (listResponse.values || []).map((value: unknown) => {
            return ProjectSchema.parse(value);
        });

        const currentFrom = listResponse.from ?? from;
        const currentCount = listResponse.count ?? items.length;
        const nextFrom = currentFrom + currentCount;
        const hasMore = listResponse.fullResultSize != null ? nextFrom < listResponse.fullResultSize : items.length === 100;

        return {
            items,
            ...(hasMore && { nextCursor: String(nextFrom) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
