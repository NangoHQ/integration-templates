import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    filter: z.string().optional().describe('OData filter query parameter using eq operator only. Example: displayName eq Global Administrator'),
    select: z
        .string()
        .optional()
        .describe('OData select query parameter to specify which properties to include in the response. Example: id,displayName,description'),
    top: z.number().int().min(1).max(999).optional().describe('Maximum number of records to return per page.'),
    cursor: z.string().optional().describe('Pagination cursor (skipToken) from the previous response. Omit for the first page.')
});

const DirectoryRoleSchema = z.object({
    id: z.string(),
    deletedDateTime: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
    roleTemplateId: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    value: z.array(DirectoryRoleSchema),
    '@odata.nextLink': z.string().optional(),
    '@odata.context': z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            id: z.string(),
            deletedDateTime: z.string().optional(),
            description: z.string().optional(),
            displayName: z.string().optional(),
            roleTemplateId: z.string().optional()
        })
    ),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List directory roles from Microsoft Graph. Returns activated directory roles in the tenant.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-directory-roles',
        group: 'Directory'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['RoleManagement.Read.Directory'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.filter) {
            params['$filter'] = input.filter;
        }
        if (input.select) {
            params['$select'] = input.select;
        }
        if (input.top) {
            params['$top'] = input.top;
        }
        let response;
        if (input.cursor) {
            // https://learn.microsoft.com/en-us/graph/api/directoryrole-list
            response = await nango.get({ endpoint: input.cursor, retries: 3 });
        } else {
            // https://learn.microsoft.com/en-us/graph/api/directoryrole-list
            response = await nango.get({ endpoint: '/v1.0/directoryRoles', params, retries: 3 });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.value.map((role) => ({
            id: role.id,
            ...(role.deletedDateTime != null && { deletedDateTime: role.deletedDateTime }),
            ...(role.description != null && { description: role.description }),
            ...(role.displayName != null && { displayName: role.displayName }),
            ...(role.roleTemplateId != null && { roleTemplateId: role.roleTemplateId })
        }));

        return {
            items,
            ...(providerResponse['@odata.nextLink'] != null && { next_cursor: providerResponse['@odata.nextLink'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
