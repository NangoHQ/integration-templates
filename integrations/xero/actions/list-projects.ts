import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
    })
    .describe('Input for listing Xero projects.');

const AmountSchema = z.object({
    currency: z.string().optional().describe('Currency code. Example: "USD"'),
    value: z.number().optional().describe('Monetary value.')
});

const ProjectSchema = z
    .object({
        projectId: z.string().describe('Unique identifier for the project. Example: "254553fa-2be8-4991-bd5e-70a97ea12ef8"'),
        contactId: z.string().optional().describe('Identifier of the contact associated with the project.'),
        name: z.string().optional().describe('Name of the project.'),
        currencyCode: z.string().optional().describe('Currency code for the project.'),
        minutesLogged: z.number().optional().describe('Total minutes logged against the project.'),
        totalTaskAmount: AmountSchema.optional().describe('Total monetary amount for tasks on the project.'),
        status: z.enum(['INPROGRESS', 'CLOSED']).optional().describe('Status of the project.'),
        estimate: AmountSchema.optional().describe('Estimated total for the project.'),
        deadlineUtc: z.string().optional().describe('Deadline for the project in UTC ISO-8601 format.')
    })
    .passthrough();

const OutputSchema = z
    .object({
        items: z.array(ProjectSchema).describe('Array of projects returned by the Xero Projects API.'),
        nextCursor: z.string().optional().describe('Pagination cursor for the next page. Omit when there are no more pages.')
    })
    .describe('Output of the list-projects action.');

/**
 * @tags: [read]
 * @tagReason: Reads projects from the Xero Projects API.
 * @pitfalls: Projects cannot be deleted from Xero; they only transition to CLOSED status, so the returned list accumulates permanently and may contain inactive projects.
 */
const action = createAction({
    description: 'List projects in the Xero Projects API.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['projects.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        const connectionConfigSchema = z.record(z.string(), z.unknown());
        const metadataSchema = z.record(z.string(), z.unknown());

        let tenantId: string | undefined;

        const parsedConnectionConfig = connectionConfigSchema.safeParse(connection.connection_config);
        if (
            parsedConnectionConfig.success &&
            typeof parsedConnectionConfig.data['tenant_id'] === 'string' &&
            parsedConnectionConfig.data['tenant_id'].length > 0
        ) {
            tenantId = parsedConnectionConfig.data['tenant_id'];
        }

        if (!tenantId) {
            const parsedMetadata = metadataSchema.safeParse(connection.metadata);
            if (parsedMetadata.success && typeof parsedMetadata.data['tenantId'] === 'string' && parsedMetadata.data['tenantId'].length > 0) {
                tenantId = parsedMetadata.data['tenantId'];
            }
        }

        if (!tenantId) {
            const connectionsConfig: ProxyConfiguration = {
                // https://developer.xero.com/documentation/api/accounting/overview#connections
                endpoint: 'connections',
                retries: 10
            };
            const connectionsResponse = await nango.get(connectionsConfig);

            const rawConnections = connectionsResponse.data;
            if (!Array.isArray(rawConnections) || rawConnections.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (rawConnections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = z.record(z.string(), z.unknown()).safeParse(rawConnections[0]);
            if (firstConnection.success && typeof firstConnection.data['tenantId'] === 'string' && firstConnection.data['tenantId'].length > 0) {
                tenantId = firstConnection.data['tenantId'];
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a valid positive integer page number.'
            });
        }

        const projectsConfig: ProxyConfiguration = {
            // https://developer.xero.com/documentation/api/projects/projects
            endpoint: 'projects.xro/2.0/Projects',
            headers: {
                'xero-tenant-id': tenantId
            },
            params: {
                page: String(page)
            },
            retries: 3
        };
        const response = await nango.get(projectsConfig);

        const rawDataSchema = z.record(z.string(), z.unknown());
        const parsedRawData = rawDataSchema.safeParse(response.data);
        if (!parsedRawData.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse projects response.'
            });
        }

        const data = parsedRawData.data;
        const itemsRaw = data['items'];
        const itemsArraySchema = z.array(z.record(z.string(), z.unknown()));
        const parsedItems = itemsArraySchema.safeParse(itemsRaw);
        if (!parsedItems.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse projects items array.'
            });
        }

        const paginationSchema = z.object({
            page: z.number().optional(),
            pageSize: z.number().optional(),
            pageCount: z.number().optional(),
            itemCount: z.number().optional()
        });
        const paginationRaw = data['pagination'];
        const parsedPagination = paginationSchema.safeParse(paginationRaw);
        const pagination = parsedPagination.success ? parsedPagination.data : {};

        const projects = parsedItems.data.map((item) => ProjectSchema.parse(item));

        const currentPage = pagination.page ?? page;
        const pageCount = pagination.pageCount ?? currentPage;
        const nextCursor = currentPage < pageCount ? String(currentPage + 1) : undefined;

        return {
            items: projects,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
