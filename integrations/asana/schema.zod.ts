// Generated by ts-to-zod
import { z } from 'zod';

export const idSchema = z.object({
    id: z.string()
});

export const timestampsSchema = z.object({
    created_at: z.string().nullable(),
    modified_at: z.string().nullable()
});

export const nangoActionErrorSchema = z.object({
    type: z.union([z.literal('validation_error'), z.literal('generic_error')]),
    message: z.string()
});

export const baseAsanaModelSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string()
});

export const limitSchema = z.object({
    limit: z.union([z.number(), z.undefined()])
});

export const userSchema = z.object({
    created_at: z.string().nullable(),
    modified_at: z.string().nullable(),
    id: z.string(),
    name: z.string(),
    email: z.string().nullable(),
    avatar_url: z.string().nullable()
});

export const taskSchema = z.object({
    created_at: z.string().nullable(),
    modified_at: z.string().nullable(),
    id: z.string(),
    title: z.string(),
    url: z.string(),
    status: z.string(),
    description: z.string().nullable(),
    assignee: userSchema.nullable(),
    due_date: z.string().nullable()
});

export const asanaProjectInputSchema = z.object({
    limit: z.union([z.number(), z.undefined()]),
    workspace: z.string()
});

export const createAsanaTaskSchema = z.object({
    name: z.string(),
    workspace: z.union([z.string(), z.undefined()]),
    parent: z.union([z.string(), z.undefined()]),
    projects: z.union([z.array(z.string()), z.undefined()])
});

export const asanaPhotoSchema = z.object({
    image_1024x1024: z.string(),
    image_128x128: z.string(),
    image_21x21: z.string(),
    image_27x27: z.string(),
    image_36x36: z.string(),
    image_60x60: z.string()
});

export const asanaUserSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string(),
    id: z.string(),
    email: z.string(),
    photo: asanaPhotoSchema.nullable(),
    workspace: z.union([z.string(), z.undefined()])
});

export const asanaTaskSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string(),
    created_at: z.string().nullable(),
    modified_at: z.string().nullable(),
    completed: z.boolean(),
    due_date: z.string().nullable(),
    tags: z.array(z.string()),
    start_on: z.string().nullable(),
    due_at: z.string().nullable(),
    due_on: z.string().nullable(),
    completed_at: z.string().nullable(),
    actual_time_minutes: z.number(),
    assignee: asanaUserSchema.nullable(),
    start_at: z.string().nullable(),
    num_hearts: z.number(),
    num_likes: z.number(),
    workspace: baseAsanaModelSchema,
    hearted: z.boolean(),
    hearts: z.array(z.string()),
    liked: z.boolean(),
    likes: z.array(z.string()),
    notes: z.string(),
    assignee_status: z.string(),
    followers: z.array(baseAsanaModelSchema),
    parent: z.object({
        gid: z.string(),
        resource_type: z.string(),
        name: z.string(),
        resource_subtype: z.string()
    }),
    permalink_url: z.string()
});

export const asanaUpdateTaskSchema = z.object({
    id: z.string(),
    due_at: z.union([z.string(), z.undefined()]),
    due_on: z.union([z.string(), z.undefined()]),
    completed: z.union([z.boolean(), z.undefined()]),
    notes: z.union([z.string(), z.undefined()]),
    projects: z.union([z.array(z.string()), z.undefined()]),
    assignee: z.union([z.string(), z.undefined()]),
    parent: z.union([z.string(), z.undefined()]),
    tags: z.union([z.array(z.string()), z.undefined()]),
    workspace: z.union([z.string(), z.undefined()]),
    name: z.union([z.string(), z.undefined()])
});

export const asanaWorkspaceSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string(),
    id: z.string(),
    is_organization: z.boolean()
});

export const asanaProjectSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string(),
    id: z.string()
});

export const anonymousAsanaActionFetchworkspacesOutputSchema = z.array(baseAsanaModelSchema);

export const anonymousAsanaActionFetchprojectsOutputSchema = z.array(baseAsanaModelSchema);

export const anonymousAsanaActionDeletetaskOutputSchema = z.boolean();