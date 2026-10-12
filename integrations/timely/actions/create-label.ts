import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        account_id: z.number().int().positive().describe('Timely account ID. Discover it by calling the list-accounts action first. Example: 1145787'),
        name: z
            .string()
            .refine((value) => value.trim().length > 0, { message: 'name must not be blank.' })
            .describe('Name for the new label. Must not be blank. Must be unique among labels that share the same parent. Example: "Design"'),
        parent_id: z
            .number()
            .int()
            .positive()
            .nullable()
            .optional()
            .describe('ID of the parent label to nest this label under. Omit or pass null to create a top-level label. Example: 4687689')
    })
    .describe('Input for creating a Timely label.');

type Label = {
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
};

const LabelSchema: z.ZodType<Label> = z.lazy(() =>
    z
        .object({
            id: z.number().int().describe('Unique identifier of the label.'),
            name: z.string().describe('Name of the label.'),
            sequence: z.number().int().describe('Sort position of the label among its siblings.'),
            parent_id: z.number().int().nullable().describe('ID of the parent label, or null for a top-level label.'),
            emoji: z.string().nullable().describe('URL of the emoji image shown for the label, or null when none is set.'),
            active: z.boolean().describe('Whether the label is active.'),
            external_id: z.string().nullable().describe('External identifier mapped to this label, or null when unset.'),
            created_at: z.string().describe('ISO 8601 timestamp when the label was created.'),
            updated_at: z.string().describe('ISO 8601 timestamp when the label was last updated.'),
            children: z.array(LabelSchema).describe('Nested child labels. Always empty for a newly created label.')
        })
        .describe('A Timely label, optionally nested under a parent label.')
);

/**
 * @tags: [write]
 * @tagReason: Creates a new label in the provider account, a provider-side mutation.
 * @pitfalls: The account_id must first be discovered by calling list-accounts, as no current-account shortcut exists; a label's name must be unique among labels sharing the same parent (duplicates are rejected) and parent_id must reference an existing label, otherwise the request is rejected.
 */
const action = createAction({
    description: 'Create a new label, optionally nested under a parent label.',
    version: '1.0.0',
    input: InputSchema,
    output: LabelSchema,
    scopes: ['manage'],

    exec: async (nango, input): Promise<z.infer<typeof LabelSchema>> => {
        const accountId = encodeURIComponent(String(input.account_id));

        const config: ProxyConfiguration = {
            // Timely API: POST /1.1/{account_id}/labels - https://developer.timely.com/
            endpoint: `/1.1/${accountId}/labels`,
            data: {
                label: {
                    name: input.name,
                    ...(input.parent_id !== undefined && { parent_id: input.parent_id })
                }
            },
            // Label creation is not idempotent: a retry after a lost response would create a duplicate label.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };

        const response = await nango.post(config);

        return LabelSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
