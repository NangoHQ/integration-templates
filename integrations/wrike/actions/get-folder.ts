import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        folderId: z.string().describe('ID of the Wrike folder or project to retrieve. Example: "MQAAAAEQ_HoI"')
    })
    .describe('Input for retrieving a single Wrike folder or project by ID.');

const CustomFieldSchema = z.object({
    id: z.string().describe('Custom field definition ID. Example: "IEAG5DAKJUANPFG2"'),
    value: z.string().nullable().optional().describe('Value stored for this custom field on the folder; null when unset.')
});

const MetadataEntrySchema = z.object({
    key: z.string().describe('Metadata entry key.'),
    value: z.string().describe('Metadata entry value.')
});

const ProjectFinanceSchema = z.object({
    budget: z.number().nullable().optional().describe('Planned budget for the project.'),
    actualCost: z.number().nullable().optional().describe('Actual cost incurred by the project.'),
    actualFees: z.number().nullable().optional().describe('Actual fees billed for the project.'),
    plannedCost: z.number().nullable().optional().describe('Planned cost for the project.'),
    plannedFees: z.number().nullable().optional().describe('Planned fees for the project.'),
    currency: z.string().nullable().optional().describe('Currency code for the finance amounts. Example: "USD".')
});

const ProjectSchema = z.object({
    authorId: z.string().optional().describe('User ID of the project author. Example: "KUAZR5CO"'),
    ownerIds: z.array(z.string()).optional().describe('User IDs of the project owners.'),
    customStatusId: z.string().nullable().optional().describe('Custom workflow status ID of the project. Example: "IEAG5DAKJMHVMQVI"'),
    createdDate: z.string().optional().describe('Project creation timestamp in ISO 8601 UTC. Example: "2026-10-07T01:48:56Z"'),
    status: z.string().nullable().optional().describe('Project status. Example: "Green".'),
    startDate: z.string().nullable().optional().describe('Project start date. Example: "2026-10-01".'),
    endDate: z.string().nullable().optional().describe('Project end date. Example: "2026-12-31".'),
    completedDate: z.string().nullable().optional().describe('Project completion timestamp in ISO 8601 UTC.'),
    contractType: z.string().nullable().optional().describe('Project contract type: "Billable" or "NonBillable".'),
    finance: ProjectFinanceSchema.optional().describe('Project finance details, when available.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Folder or project ID. Example: "MQAAAAEQ_HoI"'),
        accountId: z.string().optional().describe('Wrike account ID that owns the folder. Example: "IEAG5DAK"'),
        title: z.string().describe('Folder or project title. Example: "First project"'),
        description: z.string().nullable().optional().describe('Folder or project description; may be an empty string.'),
        briefDescription: z.string().nullable().optional().describe('Short folder description, returned when the briefDescription field is requested.'),
        color: z.string().nullable().optional().describe('Folder color name, or "None" when no color is set.'),
        createdDate: z.string().optional().describe('Creation timestamp in ISO 8601 UTC. Example: "2026-10-07T01:48:56Z"'),
        updatedDate: z.string().optional().describe('Last update timestamp in ISO 8601 UTC. Example: "2026-10-09T23:33:02Z"'),
        sharedIds: z.array(z.string()).optional().describe('User, group, and invitation IDs the folder is shared with.'),
        parentIds: z.array(z.string()).optional().describe('Parent folder IDs; the virtual Root or Recycle Bin ID for top-level folders.'),
        childIds: z.array(z.string()).optional().describe('IDs of folders directly nested inside this folder.'),
        superParentIds: z.array(z.string()).optional().describe('Super parent folder IDs, from the Selective Sharing feature.'),
        scope: z.string().describe('Current scope: "WsFolder"/"WsRoot" for active items, "RbFolder"/"RbRoot" for Recycle Bin items.'),
        hasAttachments: z.boolean().optional().describe('Whether the folder has attachments.'),
        hasBacklog: z.boolean().optional().describe('Whether the folder has a backlog.'),
        workflowId: z.string().optional().describe('ID of the workflow applied to the folder. Example: "IEAG5DAKK4HVMQV4"'),
        metadata: z.array(MetadataEntrySchema).optional().describe('Custom metadata entries stored on the folder.'),
        customFields: z.array(CustomFieldSchema).optional().describe('Custom field values set on the folder; empty when none are set.'),
        permalink: z.string().optional().describe('Human-facing Wrike URL for the folder. Example: "https://www.wrike.com/open.htm?id=4579949064"'),
        space: z.boolean().optional().describe('Whether the folder is a space.'),
        customItemTypeId: z.string().nullable().optional().describe('Custom item type ID, when the folder uses a custom type.'),
        project: ProjectSchema.optional().describe('Present only when the folder is a Project; contains project-specific fields.')
    })
    .describe('A Wrike folder or project.');

const ProviderResponseSchema = z.object({
    kind: z.string().optional(),
    data: z.array(OutputSchema)
});

/**
 * @tags: [read]
 * @tagReason: Reads an existing folder or project by ID without modifying provider state.
 * @pitfalls: Get-by-id is not filtered by deletion state: a soft-deleted folder still returns 200 with scope "RbFolder" instead of a 404; a Project is a Folder that carries a `project` sub-object (plain folders omit the key), and an invalid ID fails with an error rather than returning an empty result.
 */
const action = createAction({
    description: 'Retrieve a single folder (or Project, if it has a project sub-object) by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.wrike.com/reference/getfoldersmulti
            endpoint: `/folders/${encodeURIComponent(input.folderId)}`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const folder = parsed.data[0];

        if (!folder) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `No folder found with ID "${input.folderId}".`
            });
        }

        return folder;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
