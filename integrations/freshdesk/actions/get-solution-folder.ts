import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('Unique ID of the solution folder. Example: 4')
    })
    .describe('Input for retrieving a single Freshdesk solution folder.');

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
    hierarchy: z.array(ProviderHierarchyItemSchema).nullable().optional(),
    articles_count: z.number().nullable().optional(),
    sub_folders_count: z.number().nullable().optional(),
    visibility: z.number().nullable().optional(),
    company_ids: z.array(z.number()).nullable().optional(),
    contact_segment_ids: z.array(z.number()).nullable().optional(),
    company_segment_ids: z.array(z.number()).nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

const HierarchyDataSchema = z.object({
    id: z.number().describe('ID of the hierarchy item.'),
    name: z.string().describe('Name of the hierarchy item.'),
    language: z.string().describe('Language code of the hierarchy item. Example: "en"')
});

const HierarchyItemSchema = z.object({
    level: z.number().describe('Depth level in the hierarchy. Example: 0'),
    type: z.string().describe('Type of hierarchy item. Example: "category" or "folder"'),
    data: HierarchyDataSchema.describe('Details of the hierarchy item at this level.')
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique ID of the solution folder.'),
        name: z.string().describe('Name of the solution folder.'),
        description: z.string().optional().describe('Description of the solution folder.'),
        parent_folder_id: z.number().optional().describe('ID of the parent folder.'),
        hierarchy: z.array(HierarchyItemSchema).optional().describe('Parent category and folders in which the folder is placed.'),
        articles_count: z.number().optional().describe('Number of articles present inside the folder.'),
        sub_folders_count: z.number().optional().describe('Number of folders present inside the folder.'),
        visibility: z
            .number()
            .optional()
            .describe(
                'Accessibility of this folder. 1=All Users, 2=Logged In Users, 3=Agents, 4=Selected Companies, 5=Bots, 6=Selected Contact Segments, 7=Selected Company Segments.'
            ),
        company_ids: z.array(z.number()).optional().describe('IDs of the companies to whom this solution folder is visible.'),
        contact_segment_ids: z.array(z.number()).optional().describe('IDs of the contact segments to whom this solution folder is visible.'),
        company_segment_ids: z.array(z.number()).optional().describe('IDs of the company segments to whom this solution folder is visible.'),
        created_at: z.string().optional().describe('Solution folder creation timestamp in UTC. Example: "2016-09-08T12:04:49Z".'),
        updated_at: z.string().optional().describe('Solution folder updated timestamp in UTC. Example: "2016-09-08T13:17:47Z".')
    })
    .describe('A single Freshdesk solution folder.');

/**
 * @tags: [read]
 * @tagReason: Performs a single GET request to retrieve an existing solutions folder by ID.
 * @pitfalls: `parent_folder_id`, `sub_folders_count`, and `hierarchy` only populate when the Flexible Hierarchy feature is enabled; `contact_segment_ids` and `company_segment_ids` require the customer segments feature and may be omitted.
 */
const action = createAction({
    description: 'Retrieve a single solutions folder from Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.freshdesk.com/api/#view_a_solution_folder
            endpoint: `/api/v2/solutions/folders/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Solution folder not found',
                id: input.id
            });
        }

        const providerFolder = ProviderFolderSchema.parse(response.data);

        return {
            id: providerFolder.id,
            name: providerFolder.name,
            ...(providerFolder.description != null && { description: providerFolder.description }),
            ...(providerFolder.parent_folder_id != null && { parent_folder_id: providerFolder.parent_folder_id }),
            ...(providerFolder.hierarchy != null && { hierarchy: providerFolder.hierarchy }),
            ...(providerFolder.articles_count != null && { articles_count: providerFolder.articles_count }),
            ...(providerFolder.sub_folders_count != null && { sub_folders_count: providerFolder.sub_folders_count }),
            ...(providerFolder.visibility != null && { visibility: providerFolder.visibility }),
            ...(providerFolder.company_ids != null && { company_ids: providerFolder.company_ids }),
            ...(providerFolder.contact_segment_ids != null && { contact_segment_ids: providerFolder.contact_segment_ids }),
            ...(providerFolder.company_segment_ids != null && { company_segment_ids: providerFolder.company_segment_ids }),
            ...(providerFolder.created_at != null && { created_at: providerFolder.created_at }),
            ...(providerFolder.updated_at != null && { updated_at: providerFolder.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
