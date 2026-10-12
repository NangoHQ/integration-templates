import { z } from 'zod';
import { createAction } from 'nango';

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
        id: z.number().describe('Unique label ID. Example: 4687689'),
        name: z.string().describe('Label name. Example: "Phase"'),
        sequence: z.number().describe('Display order of the label among its siblings. Example: 1'),
        parent_id: z.number().nullable().describe('ID of the parent label, or null for a top-level label.'),
        emoji: z.string().nullable().describe('URL of the label emoji, or null if the label has none.'),
        active: z.boolean().describe('Whether the label is active.'),
        external_id: z.string().nullable().describe('External identifier for the label, or null if none was set.'),
        created_at: z.string().describe('ISO 8601 timestamp when the label was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the label was last updated.'),
        children: z.array(LabelSchema).describe('Nested child labels. Empty array for a label with no children.')
    })
);

const InputSchema = z
    .object({
        account_id: z.number().int().positive().describe('Timely account ID. Discover it with the list-accounts action. Example: 1145787')
    })
    .describe('Input for listing the labels of a Timely account.');

const OutputSchema = z
    .object({
        labels: z.array(LabelSchema).describe('Top-level labels in the account. Each label nests its child labels in the children array.')
    })
    .describe('All labels in the Timely account, returned as a hierarchical tree.');

/**
 * @tags: [read]
 * @tagReason: Fetches the account's labels from the provider without modifying any data.
 * @pitfalls: Labels are account-wide and independent of projects, so a listed label ID can only be attached to an event once that event's project has labels enabled; results come back as a nested tree of top-level labels rather than a flat list.
 */
const action = createAction({
    description: 'List all labels in the account (hierarchical - top-level labels carry a children array).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.timely.com/ (docs portal is login-walled; endpoint path and response shape confirmed against the live API)
        const response = await nango.get({
            endpoint: `/1.1/${input.account_id}/labels`,
            retries: 3
        });

        const labels = z.array(LabelSchema).parse(response.data);

        return {
            labels
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
