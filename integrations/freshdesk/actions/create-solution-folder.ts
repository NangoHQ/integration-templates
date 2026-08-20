import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        category_id: z.number().describe('ID of the parent category where the folder will be created.'),
        name: z.string().describe('Name of the solution folder. Must be unique within the account.'),
        description: z.string().optional().describe('Description of the solution folder.'),
        parent_folder_id: z.number().optional().describe('ID of the parent folder to create a sub-folder.'),
        visibility: z
            .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
            .optional()
            .describe('Accessibility of this folder. 1 for all users, 2 for logged-in users, 3 for agents only, 4 for selected companies. Defaults to 1.'),
        company_ids: z.array(z.number()).optional().describe('IDs of the companies to whom this solution folder is visible.'),
        contact_segment_ids: z.array(z.number()).optional().describe('IDs of the contact segments to whom this solution folder is visible.'),
        company_segment_ids: z.array(z.number()).optional().describe('IDs of the company segments to whom this solution folder is visible.')
    })
    .describe('Input to create a solutions folder in Freshdesk.');

const ProviderHierarchyDataSchema = z.object({
    id: z.number(),
    name: z.string(),
    language: z.string()
});

const ProviderHierarchyItemSchema = z.object({
    level: z.number(),
    type: z.string(),
    data: ProviderHierarchyDataSchema
});

const ProviderFolderSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
    parent_folder_id: z.number().nullable().optional(),
    hierarchy: z.array(ProviderHierarchyItemSchema).optional(),
    articles_count: z.number(),
    sub_folders_count: z.number(),
    visibility: z.number(),
    category_id: z.number(),
    company_ids: z.array(z.number()).optional(),
    contact_segment_ids: z.array(z.number()).optional(),
    company_segment_ids: z.array(z.number()).optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputHierarchyDataSchema = z.object({
    id: z.number().describe('ID of the resource at that level.'),
    name: z.string().describe('Name of the resource at that level.'),
    language: z.string().describe('Language code for the resource at that level (e.g., en).')
});

const OutputHierarchyItemSchema = z.object({
    level: z.number().describe('Depth level in the hierarchy.'),
    type: z.string().describe('Resource type at that level (e.g., category, folder).'),
    data: OutputHierarchyDataSchema.describe('Resource data for that hierarchy level.')
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the solution folder.'),
        name: z.string().describe('Name of the solution folder.'),
        description: z.string().optional().describe('Description of the solution folder.'),
        parent_folder_id: z.number().optional().describe('ID of the parent folder.'),
        hierarchy: z.array(OutputHierarchyItemSchema).describe('Hierarchy information for the folder.'),
        articles_count: z.number().describe('Number of articles present inside the folder.'),
        sub_folders_count: z.number().describe('Number of folders present inside the folder.'),
        visibility: z.number().describe('Accessibility of this folder. 1 for all users, 2 for logged-in users, 3 for agents only, 4 for selected companies.'),
        category_id: z.number().describe('ID of the parent category.'),
        company_ids: z.array(z.number()).optional().describe('IDs of the companies to whom this solution folder is visible.'),
        contact_segment_ids: z.array(z.number()).optional().describe('IDs of the contact segments to whom this solution folder is visible.'),
        company_segment_ids: z.array(z.number()).optional().describe('IDs of the company segments to whom this solution folder is visible.'),
        created_at: z.string().describe('Solution folder creation timestamp in UTC ISO 8601 format.'),
        updated_at: z.string().describe('Solution folder updated timestamp in UTC ISO 8601 format.')
    })
    .describe('Output of the created solutions folder in Freshdesk.');

/**
 * @tags: [write]
 * @tagReason: Creates a new solution folder in Freshdesk.
 * @pitfalls: The folder name must be unique across the account.
 */
const action = createAction({
    description: 'Create a solutions folder in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.freshdesk.com/api/#create_solution_folder
            endpoint: `/api/v2/solutions/categories/${encodeURIComponent(input.category_id)}/folders`,
            data: {
                name: input.name,
                visibility: input.visibility ?? 1,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.parent_folder_id !== undefined && { parent_folder_id: input.parent_folder_id }),
                ...(input.company_ids !== undefined && { company_ids: input.company_ids }),
                ...(input.contact_segment_ids !== undefined && { contact_segment_ids: input.contact_segment_ids }),
                ...(input.company_segment_ids !== undefined && { company_segment_ids: input.company_segment_ids })
            },
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- non-idempotent create/mutation; retries must be 0
            retries: 0
        });

        const providerFolder = ProviderFolderSchema.parse(response.data);

        return {
            id: providerFolder.id,
            name: providerFolder.name,
            ...(providerFolder.description != null && { description: providerFolder.description }),
            ...(providerFolder.parent_folder_id != null && { parent_folder_id: providerFolder.parent_folder_id }),
            hierarchy: providerFolder.hierarchy ?? [],
            articles_count: providerFolder.articles_count,
            sub_folders_count: providerFolder.sub_folders_count,
            visibility: providerFolder.visibility,
            category_id: providerFolder.category_id,
            ...(providerFolder.company_ids != null && { company_ids: providerFolder.company_ids }),
            ...(providerFolder.contact_segment_ids != null && { contact_segment_ids: providerFolder.contact_segment_ids }),
            ...(providerFolder.company_segment_ids != null && { company_segment_ids: providerFolder.company_segment_ids }),
            created_at: providerFolder.created_at,
            updated_at: providerFolder.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
