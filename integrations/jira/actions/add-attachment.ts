import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    cloudId: z.string().optional(),
    baseUrl: z.string().optional()
});

const InputSchema = z.object({
    issueIdOrKey: z.string().describe('The ID or key of the issue to attach the file to. Example: "10001" or "PROJ-123"'),
    file: z.object({
        content: z.string().describe('The file content as plain text or base64 encoded string'),
        filename: z.string().describe('The name of the file. Example: "document.pdf"'),
        contentType: z.string().describe('The MIME type of the file. Example: "application/pdf"'),
        isBase64: z.boolean().optional().describe('Whether the content is base64 encoded. Defaults to false')
    })
});

const AttachmentSchema = z.object({
    id: z.string(),
    self: z.string(),
    filename: z.string(),
    author: z
        .object({
            self: z.string().optional(),
            accountId: z.string().optional(),
            displayName: z.string().optional()
        })
        .loose()
        .optional(),
    created: z.string().optional(),
    size: z.number().optional(),
    mimeType: z.string().optional(),
    content: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    filename: z.string(),
    size: z.number().optional(),
    mimeType: z.string().optional(),
    url: z.string().optional()
});

const action = createAction({
    description: 'Attach a file to a Jira issue',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/add-attachment',
        group: 'Issues'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['write:jira-work', 'read:jira-work'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Get connection to resolve cloudId and baseUrl
        const connection = await nango.getConnection();

        // First, try to get from connection config
        let cloudId = connection.connection_config?.['cloudId'];
        let baseUrl = connection.connection_config?.['baseUrl'];

        // If not in connection config, try metadata
        if (!cloudId || !baseUrl) {
            const metadata = await nango.getMetadata<{ cloudId?: string; baseUrl?: string }>();
            cloudId = cloudId || metadata?.cloudId;
            baseUrl = baseUrl || metadata?.baseUrl;
        }

        // If still missing, call the accessible-resources endpoint
        if (!cloudId || !baseUrl) {
            // https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/#3--get-a-cloudid-and-baseurl
            const accessibleResourcesResponse = await nango.get({
                endpoint: 'oauth/token/accessible-resources',
                retries: 3
            });

            const resources = z
                .array(
                    z.object({
                        id: z.string(),
                        url: z.string(),
                        name: z.string(),
                        scopes: z.array(z.string()),
                        avatarUrl: z.string()
                    })
                )
                .parse(accessibleResourcesResponse.data);

            if (!resources || resources.length === 0) {
                throw new nango.ActionError({
                    type: 'no_accessible_resources',
                    message: 'No accessible Jira resources found for this connection'
                });
            }

            const firstResource = resources[0];
            if (!firstResource) {
                throw new nango.ActionError({
                    type: 'no_accessible_resources',
                    message: 'No accessible Jira resources found for this connection'
                });
            }

            cloudId = firstResource.id;
            baseUrl = firstResource.url;

            // Cache the values in metadata for subsequent runs
            // https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/#3--get-a-cloudid-and-baseurl
            await nango.updateMetadata({
                cloudId: cloudId,
                baseUrl: baseUrl
            });
        }

        // For file uploads to Jira, we need to use the underlying proxy with proper form-data handling
        // Since Nango's proxy handles Buffer data specially, we'll construct the request carefully
        const fileBuffer = input.file.isBase64
            ? Buffer.from(input.file.content, 'base64')
            : Buffer.from(input.file.content, 'utf-8');

        // Build multipart form data using Blob-like approach with strings
        const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);

        // Build the multipart body parts
        const preData =
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="file"; filename="${input.file.filename}"\r\n` +
            `Content-Type: ${input.file.contentType}\r\n\r\n`;
        const postData = `\r\n--${boundary}--\r\n`;

        // Combine as a Buffer
        const body = Buffer.concat([new Uint8Array(Buffer.from(preData, 'utf-8')), new Uint8Array(fileBuffer), new Uint8Array(Buffer.from(postData, 'utf-8'))]);

        // Get OAuth token for direct API call
        const token = await nango.getToken();
        const accessToken =
            typeof token === 'object' && token !== null && 'access_token' in token && typeof token.access_token === 'string'
                ? token.access_token
                : String(token);

        // Build the full URL for the Jira API
        const apiUrl = new URL(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${input.issueIdOrKey}/attachments`);

        // Use uncontrolledFetch for direct control over the request
        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-attachments/#api-rest-api-3-issue-issueidorkey-attachments-post
        const fetchResponse = await nango.uncontrolledFetch({
            url: apiUrl,
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'X-Atlassian-Token': 'no-check',
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            body: body.toString('binary')
        });

        if (!fetchResponse.ok) {
            const errorText = await fetchResponse.text();
            throw new nango.ActionError({
                type: 'upload_failed',
                message: `Attachment upload failed: ${fetchResponse.status} ${fetchResponse.statusText}`,
                details: errorText
            });
        }

        const responseData = await fetchResponse.json();

        const attachments = z.array(AttachmentSchema).parse(responseData);

        if (!attachments || attachments.length === 0) {
            throw new nango.ActionError({
                type: 'upload_failed',
                message: 'Attachment upload failed - no attachment returned'
            });
        }

        const attachment = attachments[0];
        if (!attachment) {
            throw new nango.ActionError({
                type: 'upload_failed',
                message: 'Attachment upload failed - no attachment returned'
            });
        }

        return {
            id: attachment.id,
            filename: attachment.filename,
            ...(attachment.size !== undefined && { size: attachment.size }),
            ...(attachment.mimeType !== undefined && { mimeType: attachment.mimeType }),
            ...(attachment.content !== undefined && { url: attachment.content })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
