import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('RFI ID. Example: "6a71df9dcb6ddf6b370e0a6f"')
});

const RfiSchema = z
    .object({
        id: z.string().optional(),
        project_id: z.string().optional(),
        title: z.string().optional(),
        rfi_number: z.string().optional(),
        due_date: z.string().optional(),
        submitted_date: z.string().nullable().optional(),
        status: z.string().optional(),
        priority: z.string().optional(),
        ball_in_court_id: z.string().nullable().optional(),
        manager_id: z.string().nullable().optional(),
        official_reviewer_id: z.string().nullable().optional(),
        responsible_contractor_ids: z.array(z.string()).optional(),
        question: z.string().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        created_by: z.string().optional(),
        updated_by: z.string().optional(),
        external_references: z.array(z.string()).optional(),
        document_ids: z.array(z.string()).optional(),
        solution_ids: z.array(z.string()).optional(),
        source_platform: z.string().nullable().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Get a single RFI by id.',
    version: '1.0.0',
    input: InputSchema,
    output: RfiSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof RfiSchema>> => {
        // https://api.ingenious.build/reference/v2-get-rfi-1.md
        const response = await nango.get({
            endpoint: `/api/v2/pub/rfis/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'RFI not found',
                rfi_id: input.id
            });
        }

        const rfi = RfiSchema.parse(response.data);
        return rfi;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
