import { z } from 'zod';
import { createAction } from 'nango';

const ResourceReferenceSchema = z.object({
    id: z.string().optional(),
    descriptor: z.string().optional(),
    href: z.string().optional()
});

const ProviderWorkerSchema = z.object({
    id: z.string(),
    descriptor: z.string().optional(),
    href: z.string().optional(),
    primaryWorkEmail: z.string().optional(),
    primaryWorkPhone: z.string().optional(),
    isManager: z.boolean().optional(),
    businessTitle: z.string().optional(),
    primarySupervisoryOrganization: ResourceReferenceSchema.optional()
});

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
        limit: z.number().int().min(1).max(100).optional().describe('Maximum number of workers to return per page. Default is 20, maximum is 100.'),
        search: z.string().optional().describe('Case-insensitive search string to filter workers by name.')
    })
    .describe('Input parameters for listing Workday worker records.');

const WorkerSchema = z
    .object({
        id: z.string().describe('The Workday ID of the worker.'),
        descriptor: z.string().optional().describe('Display descriptor for the worker, typically the full name.'),
        href: z.string().optional().describe('URL to the full worker resource.'),
        primaryWorkEmail: z.string().optional().describe('Primary work email address of the worker.'),
        primaryWorkPhone: z.string().optional().describe('Primary work phone number of the worker.'),
        isManager: z.boolean().optional().describe('Whether the worker holds a manager position.'),
        businessTitle: z.string().optional().describe('Business title of the worker.'),
        primarySupervisoryOrganization: z
            .object({
                id: z.string().optional().describe('Workday ID of the supervisory organization.'),
                descriptor: z.string().optional().describe('Display descriptor of the supervisory organization.'),
                href: z.string().optional().describe('URL to the supervisory organization resource.')
            })
            .optional()
            .describe('Primary supervisory organization of the worker.')
    })
    .describe('A single Workday worker record.');

const OutputSchema = z
    .object({
        items: z.array(WorkerSchema).describe('Array of worker records.'),
        total: z.number().optional().describe('Total number of workers available across all pages.'),
        nextCursor: z.string().optional().describe('Cursor to pass for the next page of results. Omit if there are no more pages.')
    })
    .describe('Output of the list workers action, containing paginated worker records.');

/**
 * @tags: [read]
 * @tagReason: Performs a read-only GET request to list worker records from Workday.
 * @pitfalls: primaryWorkEmail and primaryWorkPhone are frequently absent from worker records; contingent workers are returned alongside employees and indicated only by a [C] suffix in the descriptor.
 */
const action = createAction({
    description: 'List worker (employee/contingent worker) records.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const MetadataSchema = z.object({
            tenant: z.string().min(1)
        });
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Tenant is missing in connection metadata.'
            });
        }
        const tenant = parsedMetadata.data.tenant;

        const limit = input.limit ?? 20;

        let offset = 0;
        if (input.cursor !== undefined) {
            const parsed = Number(input.cursor);
            if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'Cursor must be a non-negative integer.'
                });
            }
            offset = parsed;
        }

        // https://community.workday.com/sites/default/files/file-hosting/restapi/index.html
        const response = await nango.get({
            endpoint: `/common/v1/${encodeURIComponent(tenant)}/workers`,
            params: {
                limit: String(limit),
                offset: String(offset),
                ...(input.search !== undefined && { search: input.search })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                data: z.array(ProviderWorkerSchema).optional(),
                total: z.number().optional()
            })
            .parse(response.data);

        const items = (providerResponse.data ?? []).map((worker) => ({
            id: worker.id,
            ...(worker.descriptor !== undefined && { descriptor: worker.descriptor }),
            ...(worker.href !== undefined && { href: worker.href }),
            ...(worker.primaryWorkEmail !== undefined && { primaryWorkEmail: worker.primaryWorkEmail }),
            ...(worker.primaryWorkPhone !== undefined && { primaryWorkPhone: worker.primaryWorkPhone }),
            ...(worker.isManager !== undefined && { isManager: worker.isManager }),
            ...(worker.businessTitle !== undefined && { businessTitle: worker.businessTitle }),
            ...(worker.primarySupervisoryOrganization !== undefined && {
                primarySupervisoryOrganization: {
                    ...(worker.primarySupervisoryOrganization.id !== undefined && { id: worker.primarySupervisoryOrganization.id }),
                    ...(worker.primarySupervisoryOrganization.descriptor !== undefined && { descriptor: worker.primarySupervisoryOrganization.descriptor }),
                    ...(worker.primarySupervisoryOrganization.href !== undefined && { href: worker.primarySupervisoryOrganization.href })
                }
            })
        }));

        const total = providerResponse.total ?? items.length;
        const nextOffset = offset + items.length;
        const nextCursor = items.length > 0 && nextOffset < total ? String(nextOffset) : undefined;

        return {
            items,
            total,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
