import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.union([z.string(), z.number()]).describe('Hubstaff user ID. Example: "4453817"'),
    project_id: z.union([z.string(), z.number()]).describe('Hubstaff project ID. Example: 4145631'),
    start_time: z.string().describe('ISO 8601 start time. Example: "2026-07-30T10:00:00Z"'),
    tracked: z.number().describe('Tracked time in seconds. Example: 3600'),
    note: z.string().optional().describe('Reason/note for the manual time entry. Required by some organizations.')
});

const ProviderResponseSchema = z.object({
    success: z.boolean()
});

const OutputSchema = z.object({
    success: z.boolean(),
    user_id: z.string(),
    project_id: z.string(),
    start_time: z.string(),
    tracked: z.number(),
    note: z.string().optional()
});

const action = createAction({
    description: 'Manually log tracked time for a user against a project',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['hubstaff:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const userId = String(input.user_id);

        let projectId: number;
        if (typeof input.project_id === 'number') {
            projectId = input.project_id;
        } else if (/^\d+$/.test(input.project_id) && Number.isSafeInteger(Number(input.project_id))) {
            projectId = Number(input.project_id);
        } else {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'project_id must be a positive integer.'
            });
        }

        if (!Number.isSafeInteger(projectId) || projectId <= 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'project_id must be a positive integer.'
            });
        }

        const body: Record<string, unknown> = {
            project_id: projectId,
            start_time: input.start_time,
            tracked: input.tracked
        };

        if (input['note'] !== undefined) {
            body['note'] = input['note'];
        }

        // https://developer.hubstaff.com/
        const response = await nango.post({
            endpoint: `v2/users/${encodeURIComponent(userId)}/time_entries`,
            data: body,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'create_failed',
                message: 'Hubstaff returned success: false for time entry creation'
            });
        }

        return {
            success: true,
            user_id: userId,
            project_id: String(projectId),
            start_time: input.start_time,
            tracked: input.tracked,
            ...(input['note'] !== undefined && { note: input['note'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
