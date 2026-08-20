import { z } from 'zod';
import { createAction } from 'nango';

const HierarchyDataSchema = z.object({
    id: z.number().describe('ID of the hierarchy item.'),
    name: z.string().describe('Name of the hierarchy item.'),
    language: z.string().describe('Language code of the hierarchy item.')
});

const HierarchyItemSchema = z.object({
    level: z.number().describe('Depth level in the hierarchy.'),
    type: z.string().describe('Type of the hierarchy item (e.g., category or folder).'),
    data: HierarchyDataSchema.describe('Details of the hierarchy item.')
});

const InputSchema = z
    .object({
        id: z.number().describe('Unique ID of the solution folder to update. Example: 3'),
        name: z.string().optional().describe('Name of the solution folder. Must be unique within the category.'),
        description: z.string().optional().describe('Description of the solution folder.'),
        parent_folder_id: z.number().optional().describe('ID of the parent folder for nested hierarchy.'),
        visibility: z
            .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6), z.literal(7)])
            .optional()
            .describe(
                'Accessibility of this folder. 1=All Users, 2=Logged In Users, 3=Agents, 4=Selected Companies, 5=Bots, 6=Selected Contact Segments, 7=Selected Company Segments. Default is 1.'
            ),
        company_ids: z.array(z.number()).optional().describe('IDs of the companies to whom this solution folder is visible. Required when visibility is 4.'),
        contact_segment_ids: z
            .array(z.number())
            .optional()
            .describe('IDs of the contact segments to whom this solution folder is visible. Required when visibility is 6.'),
        company_segment_ids: z
            .array(z.number())
            .optional()
            .describe('IDs of the company segments to whom this solution folder is visible. Required when visibility is 7.')
    })
    .describe('Input to update an existing Freshdesk solution folder.');

const OutputSchema = z
    .object({
        id: z.number().describe('Unique ID of the solution folder.'),
        name: z.string().describe('Name of the solution folder.'),
        description: z.string().nullable().optional().describe('Description of the solution folder.'),
        parent_folder_id: z.number().nullable().optional().describe('ID of the parent folder.'),
        hierarchy: z.array(HierarchyItemSchema).nullable().optional().describe('Parent category and folders in which the folder is placed.'),
        articles_count: z.number().nullable().optional().describe('Number of articles present inside the folder.'),
        sub_folders_count: z.number().nullable().optional().describe('Number of folders present inside the folder.'),
        visibility: z.number().describe('Accessibility of this folder.'),
        category_id: z.number().nullable().optional().describe('ID of the category to which the folder belongs.'),
        company_ids: z.array(z.number()).nullable().optional().describe('IDs of the companies to whom this folder is visible.'),
        contact_segment_ids: z.array(z.number()).nullable().optional().describe('IDs of the contact segments to whom this folder is visible.'),
        company_segment_ids: z.array(z.number()).nullable().optional().describe('IDs of the company segments to whom this folder is visible.'),
        created_at: z.string().nullable().optional().describe('Solution folder creation timestamp in UTC.'),
        updated_at: z.string().nullable().optional().describe('Solution folder updated timestamp in UTC.')
    })
    .describe('The updated Freshdesk solution folder.');

/**
 * @tags: [write]
 * @tagReason: Updates an existing solution folder on the provider.
 * @pitfalls: The parent_folder_id field is only supported when the Flexible Hierarchy feature is enabled on the account.
 */
const action = createAction({
    description: 'Update a solutions folder in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};
        if (input.name !== undefined) {
            data['name'] = input.name;
        }
        if (input.description !== undefined) {
            data['description'] = input.description;
        }
        if (input.parent_folder_id !== undefined) {
            data['parent_folder_id'] = input.parent_folder_id;
        }
        if (input.visibility !== undefined) {
            data['visibility'] = input.visibility;
        }
        if (input.company_ids !== undefined) {
            data['company_ids'] = input.company_ids;
        }
        if (input.contact_segment_ids !== undefined) {
            data['contact_segment_ids'] = input.contact_segment_ids;
        }
        if (input.company_segment_ids !== undefined) {
            data['company_segment_ids'] = input.company_segment_ids;
        }

        const response = await nango.put({
            // https://developers.freshdesk.com/api/#update_solution_folder
            endpoint: `/api/v2/solutions/folders/${encodeURIComponent(input.id)}`,
            data,
            retries: 2
        });

        const folder = OutputSchema.parse(response.data);
        return folder;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
