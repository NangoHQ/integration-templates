import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    title: z.string().optional().describe('Title of the new doc. Defaults to "Untitled".'),
    folderId: z.string().optional().describe('ID of the folder to create the doc in. Example: "fl-1Ab234".'),
    sourceDoc: z.string().optional().describe('ID of an existing doc to copy from. Example: "AbCDeFGH".')
});

const WorkspaceReferenceSchema = z.object({
    id: z.string(),
    type: z.string(),
    organizationId: z.string().optional(),
    browserLink: z.string().optional(),
    name: z.string().optional()
});

const FolderReferenceSchema = z.object({
    id: z.string(),
    type: z.string(),
    browserLink: z.string().optional(),
    name: z.string().optional()
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
    id: z.string(),
    type: z.string(),
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
    workspace: WorkspaceReferenceSchema.optional(),
    folder: FolderReferenceSchema.optional(),
    workspaceId: z.string().optional(),
    folderId: z.string().optional(),
    icon: IconSchema.optional(),
    docSize: DocSizeSchema.optional(),
    sourceDoc: SourceDocSchema.optional(),
    published: PublishedSchema.optional(),
    requestId: z.string().optional()
});

const MutationStatusSchema = z.object({
    completed: z.boolean(),
    warning: z.string().optional()
});

const OutputSchema = ProviderDocSchema.extend({
    copyCompleted: z.boolean().optional().describe('Whether the async copy (if any) has completed.'),
    copyWarning: z.string().optional().describe('Warning returned by the mutation status endpoint, if any.')
});

const action = createAction({
    description: 'Create a new doc, optionally copying from a source doc.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://coda.io/developers/apis/v1#tag/Docs/operation/createDoc
            endpoint: '/docs',
            data: {
                ...(input.title !== undefined && { title: input.title }),
                ...(input.folderId !== undefined && { folderId: input.folderId }),
                ...(input.sourceDoc !== undefined && { sourceDoc: input.sourceDoc })
            },
            retries: 10
        });

        const providerDoc = ProviderDocSchema.parse(response.data);

        if (input.sourceDoc) {
            if (!providerDoc.requestId) {
                throw new nango.ActionError({
                    type: 'missing_request_id',
                    message: 'Expected requestId for async copy but none was returned.'
                });
            }

            const maxAttempts = 15;
            const delayMs = 2000;
            let copyCompleted = false;
            let copyWarning: string | undefined;

            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                if (attempt > 0) {
                    await new Promise((resolve) => setTimeout(resolve, delayMs));
                }

                const statusResponse = await nango.get({
                    // https://coda.io/developers/apis/v1#tag/Miscellaneous/operation/getMutationStatus
                    endpoint: `/mutationStatus/${encodeURIComponent(providerDoc.requestId)}`,
                    retries: 3
                });

                const status = MutationStatusSchema.parse(statusResponse.data);

                if (status.completed) {
                    copyCompleted = true;
                    copyWarning = status.warning;
                    break;
                }
            }

            return OutputSchema.parse({
                ...providerDoc,
                copyCompleted,
                ...(copyWarning !== undefined && { copyWarning })
            });
        }

        return OutputSchema.parse({
            ...providerDoc
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
