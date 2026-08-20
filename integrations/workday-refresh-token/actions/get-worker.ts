import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        worker_id: z.string().describe('The Workday ID of the worker to retrieve. Example: "fa1a4057915f1010adcb915e0b120000"')
    })
    .describe('Input parameters for retrieving a single Workday worker.');

const ResourceReferenceSchema = z.object({
    id: z.string().optional().describe('The Workday ID of the referenced resource.'),
    descriptor: z.string().optional().describe('A display descriptor for the referenced resource.'),
    href: z.string().optional().describe('A link to the referenced resource.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('The Workday ID of the worker.'),
        descriptor: z.string().optional().describe('A display descriptor for the worker (typically full name or worker ID).'),
        href: z.string().optional().describe('A link to the full worker resource.'),
        businessTitle: z.string().optional().describe('The business title for the worker.'),
        primaryWorkEmail: z.string().optional().describe('The primary work email address.'),
        primaryWorkPhone: z.string().optional().describe('The primary work phone number.'),
        primaryWorkAddressText: z.string().optional().describe('The primary work address as a text string.'),
        yearsOfService: z.string().optional().describe('The number of years of service.'),
        isManager: z.boolean().optional().describe('Whether the worker is a manager.'),
        externalID: z.string().optional().describe('The external ID for the worker.'),
        workerID: z.string().optional().describe('The employee or contingent worker ID.'),
        hireDate: z.string().optional().describe('The hire date for the worker.'),
        terminationDate: z.string().optional().describe('The termination date, if applicable.'),
        location: ResourceReferenceSchema.optional().describe("The worker's primary work location."),
        primarySupervisoryOrganization: ResourceReferenceSchema.optional().describe('The primary supervisory organization for the worker.'),
        workerType: ResourceReferenceSchema.optional().describe('The worker type (e.g., Employee, Contingent Worker).'),
        primaryJob: ResourceReferenceSchema.optional().describe("The worker's primary job."),
        supervisoryOrganizationsManaged: z.string().optional().describe("URL to the worker's managed supervisory organizations.")
    })
    .describe('A single worker record from Workday.');

const ProviderResponseSchema = z.object({
    id: z.string(),
    descriptor: z.string().optional(),
    href: z.string().optional(),
    businessTitle: z.string().optional(),
    primaryWorkEmail: z.string().optional(),
    primaryWorkPhone: z.string().optional(),
    primaryWorkAddressText: z.string().optional(),
    yearsOfService: z.string().optional(),
    isManager: z.boolean().optional(),
    externalID: z.string().optional(),
    workerID: z.string().optional(),
    hireDate: z.string().optional(),
    terminationDate: z.string().optional(),
    location: ResourceReferenceSchema.optional(),
    primarySupervisoryOrganization: ResourceReferenceSchema.optional(),
    workerType: ResourceReferenceSchema.optional(),
    primaryJob: ResourceReferenceSchema.optional(),
    supervisoryOrganizationsManaged: z.string().optional()
});

const MetadataSchema = z.object({
    tenant: z.string().min(1).describe('The Workday tenant identifier. Example: "zktechnology_pt1"')
});

/**
 * @tags: [read]
 * @tagReason: Retrieves a single worker record from the Workday API by ID.
 * @pitfalls: Requires `tenant` metadata on the connection or the action fails at runtime. Many fields such as email, hire date, and worker ID may be absent from the response depending on the worker record.
 */
const action = createAction({
    description: "Get a single worker's record by id.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(metadata);

        if (!metadataResult.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'Missing tenant in metadata.',
                parse_error: metadataResult.error.message
            });
        }

        const tenant = metadataResult.data.tenant;

        // https://community.workday.com/sites/default/files/file-hosting/restapi/index.html
        const response = await nango.get({
            endpoint: `common/v1/${encodeURIComponent(tenant)}/workers/${encodeURIComponent(input.worker_id)}`,
            retries: 3
        });

        const providerWorker = ProviderResponseSchema.safeParse(response.data);
        if (!providerWorker.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response shape from Workday API.',
                parse_error: providerWorker.error.message
            });
        }

        const data = providerWorker.data;

        return {
            id: data.id,
            ...(data.descriptor !== undefined && { descriptor: data.descriptor }),
            ...(data.href !== undefined && { href: data.href }),
            ...(data.businessTitle !== undefined && { businessTitle: data.businessTitle }),
            ...(data.primaryWorkEmail !== undefined && { primaryWorkEmail: data.primaryWorkEmail }),
            ...(data.primaryWorkPhone !== undefined && { primaryWorkPhone: data.primaryWorkPhone }),
            ...(data.primaryWorkAddressText !== undefined && { primaryWorkAddressText: data.primaryWorkAddressText }),
            ...(data.yearsOfService !== undefined && { yearsOfService: data.yearsOfService }),
            ...(data.isManager !== undefined && { isManager: data.isManager }),
            ...(data.externalID !== undefined && { externalID: data.externalID }),
            ...(data.workerID !== undefined && { workerID: data.workerID }),
            ...(data.hireDate !== undefined && { hireDate: data.hireDate }),
            ...(data.terminationDate !== undefined && { terminationDate: data.terminationDate }),
            ...(data.location !== undefined && { location: data.location }),
            ...(data.primarySupervisoryOrganization !== undefined && { primarySupervisoryOrganization: data.primarySupervisoryOrganization }),
            ...(data.workerType !== undefined && { workerType: data.workerType }),
            ...(data.primaryJob !== undefined && { primaryJob: data.primaryJob }),
            ...(data.supervisoryOrganizationsManaged !== undefined && { supervisoryOrganizationsManaged: data.supervisoryOrganizationsManaged })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
