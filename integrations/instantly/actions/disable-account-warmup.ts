import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    emails: z.array(z.string().email()).min(1).max(100).describe('List of account emails to disable warmup for. Example: ["account@domain.com"]')
});

const BackgroundJobSchema = z
    .object({
        id: z.string().describe('Unique identifier for the background job. Example: "675266e304a8e55b17f0228b"'),
        workspace_id: z.string().describe('Workspace ID. Example: "019f1a45-689a-74f8-abee-8ccb897e168d"'),
        user_id: z.string().nullable().optional().describe('The ID of the user that triggered the job.'),
        type: z.string().describe('Type of background job. Example: "update-warmup-accounts"'),
        entity_id: z.string().nullable().optional().describe('The ID of the entity the job is related to.'),
        entity_type: z.string().optional().describe('Type of entity. Example: "workspace"'),
        data: z.object({}).passthrough().optional().describe('Additional data about the job.'),
        progress: z.number().min(0).max(100).describe('Progress of the job as a percentage (0 to 100).'),
        status: z.string().describe('Job status. Example: "pending"'),
        created_at: z.string().describe('Timestamp when the job was created. Example: "2026-06-30T20:43:04.218Z"'),
        updated_at: z.string().describe('Timestamp when the job was last updated. Example: "2026-06-30T20:43:04.218Z"')
    })
    .passthrough();

const action = createAction({
    description: 'Disable warmup for accounts.',
    version: '1.0.0',
    input: InputSchema,
    output: BackgroundJobSchema,
    scopes: ['accounts:update', 'accounts:all', 'all:update', 'all:all'],

    exec: async (nango, input): Promise<z.infer<typeof BackgroundJobSchema>> => {
        // https://developer.instantly.ai/api-reference/account/disable-warmup-for-accounts.md
        const response = await nango.post({
            endpoint: '/v2/accounts/warmup/disable',
            data: {
                emails: input.emails
            },
            retries: 3
        });

        const backgroundJob = BackgroundJobSchema.parse(response.data);

        return backgroundJob;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
