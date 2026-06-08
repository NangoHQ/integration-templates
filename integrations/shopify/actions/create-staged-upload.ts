import { z } from 'zod';
import { createAction } from 'nango';

const StagedUploadResourceEnum = z.enum([
    'BULK_MUTATION_VARIABLES',
    'COLLECTION_IMAGE',
    'DISPUTE_FILE_UPLOAD',
    'FILE',
    'IMAGE',
    'MODEL_3D',
    'RETURN_LABEL',
    'SHOP_IMAGE',
    'URL_REDIRECT_IMPORT',
    'VIDEO',
    'PRODUCT_IMAGE'
]);

const StagedUploadInputSchema = z.object({
    filename: z.string().describe('The file name and extension. Example: "product-hero-image.jpg"'),
    mimeType: z.string().describe('The file MIME type. Example: "image/jpeg"'),
    resource: StagedUploadResourceEnum.describe('The intended Shopify resource type. Example: "IMAGE"'),
    fileSize: z.string().optional().describe('The file size in bytes. Required for VIDEO and MODEL_3D resources.'),
    httpMethod: z.enum(['POST', 'PUT']).optional().describe('The HTTP method for the upload request. Defaults to PUT.')
});

const InputSchema = z.object({
    uploads: z.array(StagedUploadInputSchema).describe('Array of staged upload inputs.')
});

const StagedUploadParameterSchema = z.object({
    name: z.string(),
    value: z.string()
});

const StagedMediaUploadTargetSchema = z.object({
    url: z.string(),
    resourceUrl: z.string().optional(),
    parameters: z.array(StagedUploadParameterSchema)
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string()
});

const StagedUploadsCreatePayloadSchema = z.object({
    stagedTargets: z.array(StagedMediaUploadTargetSchema).optional(),
    userErrors: z.array(UserErrorSchema)
});

const GraphQlResponseSchema = z.object({
    data: z.object({
        stagedUploadsCreate: StagedUploadsCreatePayloadSchema
    }),
    errors: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    stagedTargets: z.array(
        z.object({
            url: z.string(),
            resourceUrl: z.string().optional(),
            parameters: z.array(
                z.object({
                    name: z.string(),
                    value: z.string()
                })
            )
        })
    )
});

const action = createAction({
    description: 'Request staged upload targets before uploading files to Shopify.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-staged-upload',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_files', 'read_files'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
                stagedUploadsCreate(input: $input) {
                    stagedTargets {
                        url
                        resourceUrl
                        parameters {
                            name
                            value
                        }
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

        const variables = {
            input: input.uploads.map((upload) => ({
                filename: upload.filename,
                mimeType: upload.mimeType,
                resource: upload.resource,
                ...(upload.fileSize !== undefined && { fileSize: upload.fileSize }),
                ...(upload.httpMethod !== undefined && { httpMethod: upload.httpMethod })
            }))
        };

        // https://shopify.dev/docs/api/admin-graphql/2026-04/mutations/stagedUploadsCreate
        const response = await nango.post({
            endpoint: 'admin/api/2026-04/graphql.json',
            data: {
                query,
                variables
            },
            retries: 3
        });

        const parsed = GraphQlResponseSchema.parse(response.data);
        const payload = parsed.data.stagedUploadsCreate;

        if (payload.userErrors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Shopify returned userErrors from stagedUploadsCreate.',
                userErrors: payload.userErrors
            });
        }

        if (!payload.stagedTargets) {
            throw new nango.ActionError({
                type: 'missing_data',
                message: 'No staged targets were returned from Shopify.'
            });
        }

        return {
            stagedTargets: payload.stagedTargets.map((target) => ({
                url: target.url,
                ...(target.resourceUrl !== undefined && { resourceUrl: target.resourceUrl }),
                parameters: target.parameters.map((param) => ({
                    name: param.name,
                    value: param.value
                }))
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
