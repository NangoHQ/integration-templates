import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    space_id: z.string().describe('The ID of the space to update. Example: "901511023604"'),
    name: z.string().optional().describe('The new name for the space.'),
    color: z.string().optional().describe('The color of the space in hexadecimal format.'),
    private: z.boolean().optional().describe('Whether the space is private.'),
    admin_can_manage: z.boolean().optional().describe('Whether admins can manage the space.'),
    multiple_assignees: z.boolean().optional().describe('Whether tasks in the space can have multiple assignees.'),
    features: z
        .object({
            due_dates: z.boolean().optional().describe('Enable due dates feature.'),
            sprints: z.boolean().optional().describe('Enable sprints feature.'),
            time_tracking: z.boolean().optional().describe('Enable time tracking feature.'),
            points: z.boolean().optional().describe('Enable points feature.'),
            custom_items: z.boolean().optional().describe('Enable custom items feature.'),
            priorities: z.boolean().optional().describe('Enable priorities feature.'),
            tags: z.boolean().optional().describe('Enable tags feature.'),
            time_estimates: z.boolean().optional().describe('Enable time estimates feature.'),
            checklists: z.boolean().optional().describe('Enable checklists feature.'),
            zoom: z.boolean().optional().describe('Enable zoom integration.'),
            milestones: z.boolean().optional().describe('Enable milestones feature.'),
            reminders: z.boolean().optional().describe('Enable reminders feature.'),
            custom_fields: z.boolean().optional().describe('Enable custom fields feature.'),
            dependency_warning: z.boolean().optional().describe('Enable dependency warning feature.'),
            status_pies: z.boolean().optional().describe('Enable status pies feature.'),
            multiple_assignees: z.boolean().optional().describe('Enable multiple assignees feature.'),
            emails: z.boolean().optional().describe('Enable emails feature.')
        })
        .optional()
        .describe('Feature toggles for the space.')
});

const ProviderSpaceSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().nullable().optional(),
    private: z.boolean().nullable().optional(),
    admin_can_manage: z.boolean().nullable().optional(),
    multiple_assignees: z.boolean().nullable().optional(),
    features: z.record(z.string(), z.unknown()).optional(),
    avatar: z.string().nullable().optional(),
    statuses: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().optional(),
    private: z.boolean().optional(),
    admin_can_manage: z.boolean().optional(),
    multiple_assignees: z.boolean().optional(),
    features: z.object({}).passthrough().optional()
});

const action = createAction({
    description: 'Update a space in ClickUp.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {};

        if (input.name !== undefined) {
            requestBody['name'] = input.name;
        }
        if (input.color !== undefined) {
            requestBody['color'] = input.color;
        }
        if (input.private !== undefined) {
            requestBody['private'] = input.private;
        }
        if (input.admin_can_manage !== undefined) {
            requestBody['admin_can_manage'] = input.admin_can_manage;
        }
        if (input.multiple_assignees !== undefined) {
            requestBody['multiple_assignees'] = input.multiple_assignees;
        }
        if (input.features !== undefined) {
            requestBody['features'] = input.features;
        }

        // https://developer.clickup.com/reference/update-space
        const response = await nango.put({
            endpoint: `/api/v2/space/${encodeURIComponent(input.space_id)}`,
            data: requestBody,
            retries: 3
        });

        const space = ProviderSpaceSchema.parse(response.data);

        const result: Record<string, unknown> = {
            id: space.id,
            name: space.name
        };

        if (space.color != null) {
            result['color'] = space.color;
        }
        if (space.private != null) {
            result['private'] = space.private;
        }
        if (space.admin_can_manage != null) {
            result['admin_can_manage'] = space.admin_can_manage;
        }
        if (space.multiple_assignees != null) {
            result['multiple_assignees'] = space.multiple_assignees;
        }
        if (space.features !== undefined) {
            const normalizedFeatures: Record<string, boolean> = {};
            for (const [key, value] of Object.entries(space.features)) {
                if (typeof value === 'boolean') {
                    normalizedFeatures[key] = value;
                }
            }
            result['features'] = normalizedFeatures;
        }

        return OutputSchema.parse(result);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
