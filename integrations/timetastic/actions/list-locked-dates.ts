import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderLockedDateSchema = z.object({
    id: z.number(),
    createdAt: z.string().optional(),
    createdById: z.number().optional(),
    reason: z.string().nullable().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    organisationId: z.number().optional(),
    recordId: z.number().optional(),
    recordType: z.number().optional()
});

const LockedDateSchema = z.object({
    id: z.number(),
    createdAt: z.string().optional(),
    createdById: z.number().optional(),
    reason: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    organisationId: z.number().optional(),
    recordId: z.number().optional(),
    recordType: z.number().optional()
});

const OutputSchema = z.object({
    lockedDates: z.array(LockedDateSchema)
});

const action = createAction({
    description: 'List all locked date periods for the organisation.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://timetastic.co.uk/api/
            endpoint: '/lockeddates',
            retries: 3
        });

        const providerData = z.array(ProviderLockedDateSchema).parse(response.data);

        const lockedDates = providerData.map((date) => ({
            id: date.id,
            ...(date.createdAt !== undefined && { createdAt: date.createdAt }),
            ...(date.createdById !== undefined && { createdById: date.createdById }),
            ...(date.reason != null && { reason: date.reason }),
            ...(date.startTime !== undefined && { startTime: date.startTime }),
            ...(date.endTime !== undefined && { endTime: date.endTime }),
            ...(date.organisationId !== undefined && { organisationId: date.organisationId }),
            ...(date.recordId !== undefined && { recordId: date.recordId }),
            ...(date.recordType !== undefined && { recordType: date.recordType })
        }));

        return {
            lockedDates
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
