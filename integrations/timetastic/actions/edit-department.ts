import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Department ID. Example: 248822'),
    name: z.string().optional().describe('Department name'),
    managerId: z.number().optional().describe('User ID of the department manager'),
    maxOff: z.number().optional().describe('Maximum simultaneous absences allowed. 0 means unlimited.')
});

const OutputSchema = z.object({
    id: z.number(),
    success: z.boolean()
});

const ErrorResponseSchema = z.object({
    errorStatus: z.number(),
    errorMessage: z.string().nullable().optional()
});

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

const action = createAction({
    description: "Update a department's settings.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        try {
            response = await nango.post({
                // https://timetastic.co.uk/api/ (interactive OpenAPI reference)
                // https://help.timetastic.co.uk/en/articles/13193377-timetastic-api
                endpoint: `/departments/edit/${encodeURIComponent(String(input.id))}`,
                data: {
                    ...(input.name !== undefined && { name: input.name }),
                    ...(input.managerId !== undefined && { managerId: input.managerId }),
                    ...(input.maxOff !== undefined && { maxOff: input.maxOff })
                },
                retries: 3
            });
        } catch (err: unknown) {
            const data = isRecord(err) && isRecord(err['response']) ? err['response']['data'] : undefined;
            const parsed = ErrorResponseSchema.safeParse(data);
            throw new nango.ActionError({
                type: 'edit_failed',
                message: (parsed.success && parsed.data.errorMessage) || 'Department edit failed',
                departmentId: input.id
            });
        }

        // Timetastic can also report a failed edit in the body of a 200 response.
        const parsed = ErrorResponseSchema.safeParse(response.data);
        if (parsed.success && parsed.data.errorStatus !== 0) {
            throw new nango.ActionError({
                type: 'edit_failed',
                message: parsed.data.errorMessage || `Department edit failed with errorStatus ${parsed.data.errorStatus}`,
                departmentId: input.id
            });
        }

        return {
            id: input.id,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
