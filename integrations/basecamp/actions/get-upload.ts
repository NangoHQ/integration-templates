import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The Basecamp project (bucket) ID that owns the upload.'),
        uploadId: z.number().describe('The unique ID of the upload to retrieve.')
    })
    .describe('Input parameters for retrieving a single upload.');

const ParentSchema = z.object({
    id: z.number().describe('The ID of the parent vault.'),
    title: z.string().describe('The title of the parent vault.'),
    type: z.string().describe('The type of the parent resource.'),
    url: z.string().describe('The API URL of the parent vault.'),
    app_url: z.string().describe('The app URL of the parent vault.')
});

const BucketSchema = z.object({
    id: z.number().describe('The ID of the project bucket.'),
    name: z.string().describe('The name of the project.'),
    type: z.string().describe('The type of the bucket.')
});

const CompanySchema = z.object({
    id: z.number().describe('The company ID.'),
    name: z.string().describe('The company name.')
});

const CreatorSchema = z.object({
    id: z.number().describe('The person ID of the upload creator.'),
    attachable_sgid: z.string().describe('The attachable SGID for the creator.'),
    name: z.string().describe('The display name of the creator.'),
    personable_type: z.string().describe('The type of the person record.'),
    title: z.string().nullable().optional().describe('The job title of the creator.'),
    tagline: z.string().nullable().optional().describe('The tagline of the creator.'),
    location: z.string().nullable().optional().describe('The location of the creator.'),
    created_at: z.string().describe('The timestamp when the creator was created.'),
    updated_at: z.string().describe('The timestamp when the creator was last updated.'),
    email_address: z.string().nullable().describe('The email address of the creator, or null if the creator has no email address.'),
    bio: z.string().nullable().optional().describe('The bio of the creator.'),
    admin: z.boolean().describe('Whether the creator is an admin.'),
    owner: z.boolean().describe('Whether the creator is an owner.'),
    client: z.boolean().describe('Whether the creator is a client.'),
    employee: z.boolean().describe('Whether the creator is an employee.'),
    time_zone: z.string().describe('The time zone of the creator.'),
    avatar_url: z.string().describe('The avatar URL of the creator.'),
    company: CompanySchema.optional().describe('The company of the creator, if any. Absent when the creator has no email address.'),
    can_ping: z.boolean().describe('Whether the creator can be pinged.'),
    can_manage_projects: z.boolean().describe('Whether the creator can manage projects.'),
    can_manage_people: z.boolean().describe('Whether the creator can manage people.'),
    can_access_timesheet: z.boolean().describe('Whether the creator can access the timesheet.'),
    can_access_hill_charts: z.boolean().describe('Whether the creator can access hill charts.')
});

const OutputSchema = z
    .object({
        id: z.number().describe('The unique ID of the upload.'),
        status: z.string().describe('The status of the upload.'),
        visible_to_clients: z.boolean().describe('Whether the upload is visible to clients.'),
        created_at: z.string().describe('The timestamp when the upload was created.'),
        updated_at: z.string().describe('The timestamp when the upload was last updated.'),
        title: z.string().describe('The title of the upload.'),
        inherits_status: z.boolean().describe('Whether the upload inherits its parent status.'),
        type: z.string().describe('The resource type.'),
        url: z.string().describe('The API URL of the upload.'),
        app_url: z.string().describe('The app URL of the upload.'),
        bookmark_url: z.string().describe('The bookmark URL for the upload.'),
        subscription_url: z.string().describe('The subscription URL for the upload.'),
        comments_count: z.number().describe('The number of comments on the upload.'),
        comments_url: z.string().describe('The comments URL for the upload.'),
        boosts_count: z.number().describe('The number of boosts on the upload.'),
        boosts_url: z.string().describe('The boosts URL for the upload.'),
        position: z.number().describe('The position of the upload within its parent.'),
        parent: ParentSchema.describe('The parent vault containing the upload.'),
        bucket: BucketSchema.describe('The project bucket containing the upload.'),
        creator: CreatorSchema.describe('The person who created the upload.'),
        description: z.string().describe('The description of the upload.'),
        description_attachments: z.array(z.unknown()).describe('Attachments embedded in the description.'),
        content_type: z.string().describe('The MIME type of the uploaded file.'),
        byte_size: z.number().describe('The size of the uploaded file in bytes.'),
        filename: z.string().describe('The original filename of the upload.'),
        download_url: z.string().describe('The API download URL for the uploaded file.'),
        app_download_url: z.string().describe('The app download URL for the uploaded file.'),
        width: z.number().optional().describe('The width of the image, if applicable.'),
        height: z.number().optional().describe('The height of the image, if applicable.')
    })
    .describe('Metadata for a single upload file.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single upload's metadata from the Basecamp API.
 * @pitfalls: 404 responses may indicate a missing record, insufficient permission, or an inactive account rather than a simple not-found.
 */
const action = createAction({
    description: "Retrieve a single upload's metadata.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://github.com/basecamp/bc3-api/blob/master/sections/uploads.md
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/uploads/${encodeURIComponent(input.uploadId)}.json`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Upload not found',
                projectId: input.projectId,
                uploadId: input.uploadId
            });
        }

        const upload = OutputSchema.parse(response.data);
        return upload;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
