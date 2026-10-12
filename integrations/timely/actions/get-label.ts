import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        account_id: z.number().int().positive().describe('ID of the Timely account that owns the label. Example: 1145787'),
        label_id: z.number().int().positive().describe('ID of the label to retrieve. Example: 4687689')
    })
    .describe('Identifies the account and label to retrieve.');

interface Label {
    id: number;
    name: string;
    sequence: number;
    parent_id: number | null;
    emoji: string | null;
    active: boolean;
    external_id: string | null;
    created_at: string;
    updated_at: string;
    children: Label[];
}

const LabelSchema: z.ZodType<Label> = z.lazy(() =>
    z.object({
        id: z.number().describe('Unique ID of the label.'),
        name: z.string().describe('Display name of the label.'),
        sequence: z.number().describe('Sort order of the label among its siblings.'),
        parent_id: z.number().nullable().describe('ID of the parent label, or null when the label is top-level.'),
        emoji: z.string().nullable().describe('URL of the emoji icon assigned to the label, or null when none is set.'),
        active: z.boolean().describe('Whether the label is currently active.'),
        external_id: z.string().nullable().describe('External system identifier for the label, or null when unset.'),
        created_at: z.string().describe('ISO 8601 timestamp when the label was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the label was last updated.'),
        children: z.array(LabelSchema).describe('Child labels nested under this label.')
    })
);

const OutputSchema = LabelSchema.describe('A Timely label, including its nested child labels.');

/**
 * @tags: [read]
 * @tagReason: Retrieves an existing label from the provider without mutating any data.
 * @pitfalls: A deleted or nonexistent label ID fails with a 404 "Not found" error instead of returning null; the provider always substitutes a default emoji URL even when a label has no emoji set.
 */
const action = createAction({
    description: 'Retrieve a single label by ID, including its child labels.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // Timely API: GET /1.1/{account_id}/labels/{label_id} (https://developer.timely.com/)
            endpoint: `/1.1/${input.account_id}/labels/${input.label_id}`,
            retries: 3
        };

        const response = await nango.get(config);

        const label = LabelSchema.parse(response.data);

        return label;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
