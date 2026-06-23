import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    docId: z.string().describe('ID of the Coda doc. Example: "AbCDeFGH"')
});

const IconSchema = z.object({
    name: z.string().optional(),
    type: z.string().optional(),
    browserLink: z.string().optional()
});

const DocSizeSchema = z.object({
    totalRowCount: z.number().optional(),
    tableAndViewCount: z.number().optional(),
    pageCount: z.number().optional(),
    overApiSizeLimit: z.boolean().optional()
});

const SourceDocSchema = z.object({
    id: z.string().optional(),
    type: z.string().optional(),
    href: z.string().optional(),
    browserLink: z.string().optional()
});

const PublishedSchema = z.object({
    description: z.string().optional(),
    browserLink: z.string().optional(),
    imageLink: z.string().optional(),
    discoverable: z.boolean().optional(),
    earnCredit: z.boolean().optional(),
    mode: z.string().optional(),
    categories: z.array(z.string()).optional()
});

const FolderSchema = z.object({
    id: z.string().optional(),
    type: z.string().optional(),
    browserLink: z.string().optional(),
    name: z.string().optional()
});

const WorkspaceSchema = z.object({
    id: z.string().optional(),
    type: z.string().optional(),
    organizationId: z.string().optional(),
    browserLink: z.string().optional(),
    name: z.string().optional()
});

const ProviderDocSchema = z.object({
    id: z.string(),
    type: z.string(),
    href: z.string(),
    browserLink: z.string(),
    name: z.string(),
    owner: z.string(),
    ownerName: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    workspace: WorkspaceSchema,
    folder: FolderSchema,
    workspaceId: z.string().optional(),
    folderId: z.string().optional(),
    icon: IconSchema.optional(),
    docSize: DocSizeSchema.optional(),
    sourceDoc: SourceDocSchema.optional(),
    published: PublishedSchema.optional()
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    href: z.string(),
    browserLink: z.string(),
    name: z.string(),
    owner: z.string(),
    ownerName: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    workspace: WorkspaceSchema,
    folder: FolderSchema,
    workspaceId: z.string().optional(),
    folderId: z.string().optional(),
    icon: IconSchema.optional(),
    docSize: DocSizeSchema.optional(),
    sourceDoc: SourceDocSchema.optional(),
    published: PublishedSchema.optional()
});

const action = createAction({
    description: 'Retrieve a single doc by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        method: 'GET',
        path: '/actions/get-doc'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://coda.io/developers/apis/v1#operation/getDoc
        const response = await nango.get({
            endpoint: `/docs/${encodeURIComponent(input.docId)}`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Doc not found or invalid response',
                docId: input.docId
            });
        }

        const providerDoc = ProviderDocSchema.parse(response.data);

        return {
            id: providerDoc.id,
            type: providerDoc.type,
            href: providerDoc.href,
            browserLink: providerDoc.browserLink,
            name: providerDoc.name,
            owner: providerDoc.owner,
            ownerName: providerDoc.ownerName,
            createdAt: providerDoc.createdAt,
            updatedAt: providerDoc.updatedAt,
            workspace: providerDoc.workspace,
            folder: providerDoc.folder,
            ...(providerDoc.workspaceId !== undefined && { workspaceId: providerDoc.workspaceId }),
            ...(providerDoc.folderId !== undefined && { folderId: providerDoc.folderId }),
            ...(providerDoc.icon !== undefined && { icon: providerDoc.icon }),
            ...(providerDoc.docSize !== undefined && { docSize: providerDoc.docSize }),
            ...(providerDoc.sourceDoc !== undefined && { sourceDoc: providerDoc.sourceDoc }),
            ...(providerDoc.published !== undefined && { published: providerDoc.published })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
