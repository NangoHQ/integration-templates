import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const ProjectInputSchema = z.object({
    ownerIds: z.array(z.string()).optional().describe('Contact or user IDs of the project owners. Defaults to no owners when omitted. Example: ["KUAZR5CO"].'),
    startDate: z.string().optional().describe('Project start date in yyyy-MM-dd format. Example: "2026-10-01".'),
    endDate: z.string().optional().describe('Project end date in yyyy-MM-dd format. Example: "2026-12-31".'),
    customStatusId: z.string().optional().describe('Custom workflow status ID to assign to the project. Example: "IEAG5DAKJMAAAAAA".'),
    contractType: z.enum(['Billable', 'NonBillable']).optional().describe('Contract type of the project.'),
    budget: z.number().int().optional().describe('Project budget as a whole number. Decimal values are rejected by the API.')
});

const InputSchema = z
    .object({
        parentFolderId: z
            .string()
            .describe(
                'ID of the parent folder or space to create the folder inside. Example: "MQAAAAEQ_HoD". Use the account root folder ID to create at the top level.'
            ),
        title: z.string().min(1).describe('Title of the folder or project. Required and cannot be empty.'),
        description: z.string().optional().describe('Folder description. Left blank when omitted.'),
        project: ProjectInputSchema.optional().describe(
            'Provide this object to create a Project instead of a plain folder. Project is the same resource as a folder with extra metadata. Omit it to create a plain folder.'
        )
    })
    .describe('Input for creating a Wrike folder or project.');

const MetadataSchema = z.object({
    key: z.string().optional().describe('Metadata key.'),
    value: z.string().optional().describe('Metadata value.')
});

const CustomFieldValueSchema = z.object({
    id: z.string().optional().describe('Custom field ID.'),
    value: z.string().optional().describe('Custom field value for this folder or project.')
});

const FinanceSchema = z.object({
    currency: z.string().optional().describe('Currency of the financial values.'),
    budget: z.number().optional().describe('Project budget amount.'),
    plannedCost: z.number().optional().describe('Planned project cost.'),
    plannedFees: z.number().optional().describe('Planned project fees.'),
    actualCost: z.number().optional().describe('Actual project cost.'),
    actualFees: z.number().optional().describe('Actual project fees.')
});

const ProjectOutputSchema = z.object({
    authorId: z.string().optional().describe('ID of the user who created the project. Example: "KUAZR5CO".'),
    ownerIds: z.array(z.string()).optional().describe('Contact or user IDs of the project owners.'),
    customStatusId: z.string().optional().describe('Custom workflow status ID assigned to the project.'),
    createdDate: z.string().optional().describe('Project creation timestamp in ISO 8601 format.'),
    startDate: z.string().optional().describe('Project start date in yyyy-MM-dd format.'),
    endDate: z.string().optional().describe('Project end date in yyyy-MM-dd format.'),
    completedDate: z.string().optional().describe('Project completion timestamp in ISO 8601 format, when completed.'),
    status: z.string().optional().describe('Project status, when returned by Wrike.'),
    contractType: z.string().optional().describe('Contract type of the project, when returned by Wrike.'),
    finance: FinanceSchema.optional().describe('Financial information for the project, when available.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique ID of the created folder or project. Example: "MQAAAAEQ_HoI".'),
        accountId: z.string().optional().describe('ID of the Wrike account that owns the folder.'),
        title: z.string().describe('Title of the created folder or project.'),
        description: z.string().optional().describe('Folder description, empty when none was provided.'),
        scope: z.string().optional().describe('Tree scope of the item, e.g. "WsFolder" for an active folder.'),
        color: z.string().optional().describe('Folder color name, when set.'),
        space: z.boolean().optional().describe('Whether the item is a space.'),
        customItemTypeId: z.string().optional().describe('Custom item type ID, when the item was created from a custom item type.'),
        createdDate: z.string().optional().describe('Creation timestamp in ISO 8601 format. Example: "2026-10-09T23:33:31Z".'),
        updatedDate: z.string().optional().describe('Last update timestamp in ISO 8601 format.'),
        permalink: z.string().optional().describe('Human-facing URL of the folder in the Wrike web app.'),
        workflowId: z.string().optional().describe('ID of the workflow applied to the folder.'),
        parentIds: z.array(z.string()).optional().describe('IDs of the immediate parent folders.'),
        childIds: z.array(z.string()).optional().describe('IDs of the child folders.'),
        superParentIds: z.array(z.string()).optional().describe('IDs of the ancestor folders.'),
        sharedIds: z.array(z.string()).optional().describe('Contact or user IDs the folder is shared with.'),
        hasAttachments: z.boolean().optional().describe('Whether the folder has attachments.'),
        metadata: z.array(MetadataSchema).optional().describe('Custom metadata entries attached to the folder.'),
        customFields: z.array(CustomFieldValueSchema).optional().describe('Custom field values attached to the folder.'),
        project: ProjectOutputSchema.optional().describe('Project metadata. Present only when the item was created as a Project.')
    })
    .describe('The created Wrike folder or project.');

const ProviderResponseSchema = z.object({
    kind: z.string(),
    data: z.array(OutputSchema)
});

/**
 * @tags: [write]
 * @tagReason: Creates a new folder or project in the provider, which is an additive, reversible mutation.
 * @pitfalls: Supplying `project` switches creation into Project mode while omitting it creates a plain folder, since both are the same underlying resource, and a project `budget` must be a whole number because decimal values are rejected.
 */
const action = createAction({
    description: 'Create a new folder or project under a parent folder or space.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {
            title: input.title
        };

        if (input.description !== undefined) {
            params['description'] = input.description;
        }

        if (input.project !== undefined) {
            const project: Record<string, string | number | string[]> = {};

            if (input.project.ownerIds !== undefined) {
                project['ownerIds'] = input.project.ownerIds;
            }
            if (input.project.startDate !== undefined) {
                project['startDate'] = input.project.startDate;
            }
            if (input.project.endDate !== undefined) {
                project['endDate'] = input.project.endDate;
            }
            if (input.project.customStatusId !== undefined) {
                project['customStatusId'] = input.project.customStatusId;
            }
            if (input.project.contractType !== undefined) {
                project['contractType'] = input.project.contractType;
            }
            if (input.project.budget !== undefined) {
                project['budget'] = input.project.budget;
            }

            params['project'] = JSON.stringify(project);
        }

        const config: ProxyConfiguration = {
            // https://developers.wrike.com/reference/postfolderssinglefolders
            endpoint: `/folders/${encodeURIComponent(input.parentFolderId)}/folders`,
            params,
            // Folder creation is not idempotent and Wrike has no idempotency key, so a retry could create duplicate folders.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };

        // https://developers.wrike.com/reference/postfolderssinglefolders
        const response = await nango.post(config);
        const parsed = ProviderResponseSchema.parse(response.data);
        const folder = parsed.data[0];

        if (!folder) {
            throw new nango.ActionError({
                type: 'create_failed',
                message: 'Wrike did not return the created folder.',
                parentFolderId: input.parentFolderId
            });
        }

        return folder;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
