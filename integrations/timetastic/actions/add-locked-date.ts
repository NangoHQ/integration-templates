import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    from: z.string().describe('Start date of the locked period. Example: "2026-12-24"'),
    to: z.string().describe('End date of the locked period. Example: "2026-12-27"'),
    reason: z.string().describe('Reason for the locked date. Example: "Office closed for holidays"'),
    recordId: z.number().describe('The organisation id for Organisation scope, or the specific department/user id otherwise. Example: 100741'),
    recordType: z.enum(['Organisation', 'Department', 'User']).describe("Scope of the lock: 'Organisation', 'Department', or 'User'.")
});

const ProviderResponseSchema = z.object({
    id: z.number(),
    createdOverExistingBookings: z.boolean()
});

const OutputSchema = z.object({
    id: z.number(),
    createdOverExistingBookings: z.boolean()
});

const action = createAction({
    description: 'Create a locked date period that blocks leave requests.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://timetastic.co.uk/api/ (interactive OpenAPI reference)
        // https://help.timetastic.co.uk/en/articles/13193377-timetastic-api
        const response = await nango.post({
            endpoint: '/lockeddates',
            data: {
                from: input.from,
                to: input.to,
                reason: input.reason,
                recordId: input.recordId,
                recordType: input.recordType
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.id,
            createdOverExistingBookings: providerResponse.createdOverExistingBookings
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
