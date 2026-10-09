import { z } from 'zod';
import { createAction } from 'nango';

interface TimelyLabel {
    id: number;
    name: string;
    sequence: number;
    parent_id: number | null;
    emoji: string | null;
    active: boolean;
    external_id: string | null;
    created_at: string;
    updated_at: string;
    children: TimelyLabel[];
}

const LabelSchema: z.ZodType<TimelyLabel> = z.lazy(() =>
    z.object({
        id: z.number().describe('Unique identifier of the label. Example: 4687689.'),
        name: z.string().describe('Display name of the label.'),
        sequence: z.number().describe('Sort order of the label among its siblings.'),
        parent_id: z.number().nullable().describe('ID of the parent label, or null when the label is top-level.'),
        emoji: z.string().nullable().describe('URL of the emoji/icon assigned to the label, or null when none is set.'),
        active: z.boolean().describe('Whether the label is active.'),
        external_id: z.string().nullable().describe('External identifier associated with the label, or null when none is set.'),
        created_at: z.string().describe('Timestamp when the label was created (ISO 8601).'),
        updated_at: z.string().describe('Timestamp when the label was last updated (ISO 8601).'),
        children: z.array(LabelSchema).describe('Child labels nested under this label.')
    })
);

const InputSchema = z
    .object({
        account_id: z.number().int().describe('Timely account ID, discovered via list-accounts. Example: 1145787.'),
        label_id: z.number().int().describe('ID of the label to update. Example: 4687689.'),
        name: z.string().optional().describe('New label name. Must not be empty.'),
        parent_id: z.number().int().optional().describe('ID of the parent label to nest this label under.'),
        emoji: z.string().optional().describe('URL of the emoji/icon to assign to the label.'),
        active: z.boolean().optional().describe('Whether the label is active.'),
        sequence: z.number().int().optional().describe('Sort order of the label among its siblings.'),
        external_id: z.string().optional().describe('External identifier to associate with the label.')
    })
    .describe('Fields to change on the label; omitted fields keep their current values.');

/**
 * @tags: [write]
 * @tagReason: Updates an existing label through the Timely API, mutating provider state.
 * @pitfalls: Reparenting a label by passing parent_id can renumber the sequence values of its existing sibling labels, and the returned object reflects only the updated label, not those sibling changes.
 */
const action = createAction({
    description: "Update a label's fields (partial merge) - e.g. rename it.",
    version: '1.0.0',
    input: InputSchema,
    output: LabelSchema.describe('The updated label object.'),

    exec: async (nango, input): Promise<z.infer<typeof LabelSchema>> => {
        const label = {
            ...(input.name !== undefined && { name: input.name }),
            ...(input.parent_id !== undefined && { parent_id: input.parent_id }),
            ...(input.emoji !== undefined && { emoji: input.emoji }),
            ...(input.active !== undefined && { active: input.active }),
            ...(input.sequence !== undefined && { sequence: input.sequence }),
            ...(input.external_id !== undefined && { external_id: input.external_id })
        };

        const response = await nango.put({
            // Timely API docs: https://developer.timely.com/
            endpoint: `/1.1/${encodeURIComponent(String(input.account_id))}/labels/${encodeURIComponent(String(input.label_id))}`,
            data: {
                label
            },
            retries: 3
        });

        return LabelSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
