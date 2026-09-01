import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The ID of the Basecamp project (bucket) that contains the document.'),
        documentId: z.number().describe('The ID of the document to retrieve.')
    })
    .describe('Input for retrieving a single Basecamp document.');

const CreatorCompanySchema = z.object({
    id: z.number().describe('Company ID.'),
    name: z.string().describe('Company name.')
});

const CreatorSchema = z.object({
    id: z.number().describe('Person ID.'),
    attachable_sgid: z.string().describe('Attachable SGID for @-mentions.'),
    name: z.string().describe('Person name.'),
    personable_type: z.string().describe('Person type, e.g. User or DummyUser.'),
    title: z.string().optional().describe('Job title.'),
    tagline: z.string().optional().describe('User tagline.'),
    location: z.string().optional().describe('User location.'),
    created_at: z.string().describe('ISO 8601 timestamp when the person was created.'),
    updated_at: z.string().describe('ISO 8601 timestamp when the person was last updated.'),
    email_address: z.string().optional().describe('Email address.'),
    bio: z.string().optional().describe('User bio.'),
    admin: z.boolean().describe('Whether the person is an account admin.'),
    owner: z.boolean().describe('Whether the person is the account owner.'),
    client: z.boolean().describe('Whether the person is a client.'),
    employee: z.boolean().describe('Whether the person is an employee.'),
    time_zone: z.string().describe('Time zone identifier.'),
    avatar_url: z.string().describe('URL to the person avatar image.'),
    company: CreatorCompanySchema.optional().describe('Company information.'),
    can_ping: z.boolean().describe('Whether the current user can ping this person.'),
    can_manage_projects: z.boolean().describe('Whether the person can manage projects.'),
    can_manage_people: z.boolean().describe('Whether the person can manage people.'),
    can_access_timesheet: z.boolean().describe('Whether the person can access timesheets.'),
    can_access_hill_charts: z.boolean().describe('Whether the person can access Hill Charts.')
});

const ParentSchema = z.object({
    id: z.number().describe('Parent resource ID.'),
    title: z.string().describe('Parent resource title.'),
    type: z.string().describe('Parent resource type, e.g. Vault.'),
    url: z.string().describe('API URL for the parent resource.'),
    app_url: z.string().describe('App URL for the parent resource.')
});

const BucketSchema = z.object({
    id: z.number().describe('Project (bucket) ID.'),
    name: z.string().describe('Project name.'),
    type: z.string().describe('Project type.')
});

const OutputSchema = z
    .object({
        id: z.number().describe('Document ID.'),
        status: z.string().describe('Document status, e.g. active or drafted.'),
        visible_to_clients: z.boolean().describe('Whether the document is visible to clients.'),
        created_at: z.string().describe('ISO 8601 timestamp when the document was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the document was last updated.'),
        title: z.string().describe('Document title.'),
        inherits_status: z.boolean().describe('Whether the document inherits its parent status.'),
        type: z.string().describe('Resource type, always Document.'),
        url: z.string().describe('API URL for this document.'),
        app_url: z.string().describe('App URL for this document.'),
        bookmark_url: z.string().describe('Bookmark URL for this document.'),
        subscription_url: z.string().describe('Subscription URL for this document.'),
        comments_count: z.number().describe('Number of comments on this document.'),
        comments_url: z.string().describe('API URL for comments on this document.'),
        boosts_count: z.number().describe('Number of boosts on this document.'),
        boosts_url: z.string().describe('API URL for boosts on this document.'),
        position: z.number().describe('Position within its parent vault.'),
        parent: ParentSchema.describe('Parent vault information.'),
        bucket: BucketSchema.describe('Project (bucket) information.'),
        creator: CreatorSchema.describe('Person who created this document.'),
        content: z.string().describe('Document body content as HTML.'),
        content_attachments: z.array(z.unknown()).describe('Embedded content attachments.')
    })
    .describe('Output containing a single Basecamp document.');

const ProviderCreatorCompanySchema = z.object({
    id: z.number(),
    name: z.string()
});

const ProviderCreatorSchema = z.object({
    id: z.number(),
    attachable_sgid: z.string(),
    name: z.string(),
    personable_type: z.string(),
    title: z.string().nullable().optional(),
    tagline: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    email_address: z.string().nullable().optional(),
    bio: z.string().nullable().optional(),
    admin: z.boolean(),
    owner: z.boolean(),
    client: z.boolean(),
    employee: z.boolean(),
    time_zone: z.string(),
    avatar_url: z.string(),
    company: ProviderCreatorCompanySchema.nullable().optional(),
    can_ping: z.boolean(),
    can_manage_projects: z.boolean(),
    can_manage_people: z.boolean(),
    can_access_timesheet: z.boolean(),
    can_access_hill_charts: z.boolean()
});

const ProviderParentSchema = z.object({
    id: z.number(),
    title: z.string(),
    type: z.string(),
    url: z.string(),
    app_url: z.string()
});

const ProviderBucketSchema = z.object({
    id: z.number(),
    name: z.string(),
    type: z.string()
});

const ProviderDocumentSchema = z.object({
    id: z.number(),
    status: z.string(),
    visible_to_clients: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    title: z.string(),
    inherits_status: z.boolean(),
    type: z.string(),
    url: z.string(),
    app_url: z.string(),
    bookmark_url: z.string(),
    subscription_url: z.string(),
    comments_count: z.number(),
    comments_url: z.string(),
    boosts_count: z.number(),
    boosts_url: z.string(),
    position: z.number(),
    parent: ProviderParentSchema,
    bucket: ProviderBucketSchema,
    creator: ProviderCreatorSchema,
    content: z.string(),
    content_attachments: z.array(z.unknown())
});

/**
 * @tags: [read]
 * @tagReason: Retrieves a single existing document by ID.
 * @pitfalls: A 404 may mean the document is missing, permissions are insufficient, or the account is inactive (check the Reason header).
 */
const action = createAction({
    description: 'Retrieve a single document.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/documents.md
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/documents/${encodeURIComponent(input.documentId)}.json`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Document not found',
                project_id: input.projectId,
                document_id: input.documentId
            });
        }

        const providerDocument = ProviderDocumentSchema.parse(response.data);

        function mapNullableString(value: string | null | undefined): string | undefined {
            if (typeof value === 'string') {
                return value;
            }
            return undefined;
        }

        const company = providerDocument.creator.company
            ? {
                  id: providerDocument.creator.company.id,
                  name: providerDocument.creator.company.name
              }
            : undefined;

        const creator = {
            id: providerDocument.creator.id,
            attachable_sgid: providerDocument.creator.attachable_sgid,
            name: providerDocument.creator.name,
            personable_type: providerDocument.creator.personable_type,
            title: mapNullableString(providerDocument.creator.title),
            tagline: mapNullableString(providerDocument.creator.tagline),
            location: mapNullableString(providerDocument.creator.location),
            created_at: providerDocument.creator.created_at,
            updated_at: providerDocument.creator.updated_at,
            email_address: mapNullableString(providerDocument.creator.email_address),
            bio: mapNullableString(providerDocument.creator.bio),
            admin: providerDocument.creator.admin,
            owner: providerDocument.creator.owner,
            client: providerDocument.creator.client,
            employee: providerDocument.creator.employee,
            time_zone: providerDocument.creator.time_zone,
            avatar_url: providerDocument.creator.avatar_url,
            company: company,
            can_ping: providerDocument.creator.can_ping,
            can_manage_projects: providerDocument.creator.can_manage_projects,
            can_manage_people: providerDocument.creator.can_manage_people,
            can_access_timesheet: providerDocument.creator.can_access_timesheet,
            can_access_hill_charts: providerDocument.creator.can_access_hill_charts
        };

        return {
            id: providerDocument.id,
            status: providerDocument.status,
            visible_to_clients: providerDocument.visible_to_clients,
            created_at: providerDocument.created_at,
            updated_at: providerDocument.updated_at,
            title: providerDocument.title,
            inherits_status: providerDocument.inherits_status,
            type: providerDocument.type,
            url: providerDocument.url,
            app_url: providerDocument.app_url,
            bookmark_url: providerDocument.bookmark_url,
            subscription_url: providerDocument.subscription_url,
            comments_count: providerDocument.comments_count,
            comments_url: providerDocument.comments_url,
            boosts_count: providerDocument.boosts_count,
            boosts_url: providerDocument.boosts_url,
            position: providerDocument.position,
            parent: {
                id: providerDocument.parent.id,
                title: providerDocument.parent.title,
                type: providerDocument.parent.type,
                url: providerDocument.parent.url,
                app_url: providerDocument.parent.app_url
            },
            bucket: {
                id: providerDocument.bucket.id,
                name: providerDocument.bucket.name,
                type: providerDocument.bucket.type
            },
            creator: creator,
            content: providerDocument.content,
            content_attachments: providerDocument.content_attachments
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
