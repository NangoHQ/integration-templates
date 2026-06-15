import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    subject: z.string().describe('Subject of the ticket. Example: "Support request"'),
    departmentId: z.string().describe('ID of the department in which the ticket should be created. Example: "1892000000006907"'),
    contactId: z.string().describe('ID of the contact who raised the ticket. Example: "1892000000042032"'),
    description: z.string().optional().describe('Description of the ticket.'),
    status: z.string().optional().describe('Status of the ticket. Example: "Open"'),
    priority: z.string().optional().describe('Priority of the ticket. Example: "High"'),
    assigneeId: z.string().optional().describe('ID of the agent to whom the ticket is assigned. Example: "1892000000056007"'),
    category: z.string().optional().describe('Category of the ticket. Example: "general"'),
    subCategory: z.string().optional().describe('Subcategory of the ticket.'),
    dueDate: z.string().optional().describe('Due date for resolving the ticket. Example: "2025-12-01T10:00:00.000Z"'),
    channel: z.string().optional().describe('Channel through which the ticket originated. Example: "Email"'),
    classification: z.string().optional().describe('Type of ticket.'),
    language: z.string().optional().describe('Language of the ticket. Example: "English"'),
    teamId: z.string().optional().describe('ID of the team assigned to resolve the ticket.'),
    productId: z.string().optional().describe('ID of the product to which the ticket is mapped.'),
    accountId: z.string().optional().describe('ID of the account associated with the ticket.'),
    email: z.string().optional().describe('Email address associated with the ticket.'),
    phone: z.string().optional().describe('Phone number associated with the ticket.'),
    resolution: z.string().optional().describe('Resolution of the ticket.'),
    customFields: z.record(z.string(), z.unknown()).optional(),
    cf: z.record(z.string(), z.unknown()).optional()
});

const ProviderTicketSchema = z.object({
    id: z.string(),
    ticketNumber: z.string().optional(),
    subject: z.string().optional(),
    description: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    statusType: z.string().nullable().optional(),
    priority: z.string().nullable().optional(),
    departmentId: z.string().optional(),
    contactId: z.string().nullable().optional(),
    assigneeId: z.string().nullable().optional(),
    teamId: z.string().nullable().optional(),
    accountId: z.string().nullable().optional(),
    productId: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    subCategory: z.string().nullable().optional(),
    dueDate: z.string().nullable().optional(),
    channel: z.string().nullable().optional(),
    classification: z.string().nullable().optional(),
    language: z.string().nullable().optional(),
    resolution: z.string().nullable().optional(),
    createdTime: z.string().nullable().optional(),
    modifiedTime: z.string().nullable().optional(),
    closedTime: z.string().nullable().optional(),
    webUrl: z.string().nullable().optional(),
    customFields: z.record(z.string(), z.unknown()).nullable().optional(),
    cf: z.record(z.string(), z.unknown()).nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    ticketNumber: z.string().optional(),
    subject: z.string().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
    statusType: z.string().optional(),
    priority: z.string().optional(),
    departmentId: z.string().optional(),
    contactId: z.string().optional(),
    assigneeId: z.string().optional(),
    teamId: z.string().optional(),
    accountId: z.string().optional(),
    productId: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    category: z.string().optional(),
    subCategory: z.string().optional(),
    dueDate: z.string().optional(),
    channel: z.string().optional(),
    classification: z.string().optional(),
    language: z.string().optional(),
    resolution: z.string().optional(),
    createdTime: z.string().optional(),
    modifiedTime: z.string().optional(),
    closedTime: z.string().optional(),
    webUrl: z.string().optional(),
    customFields: z.record(z.string(), z.unknown()).optional(),
    cf: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Create a ticket',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-ticket',
        group: 'Tickets'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Desk.tickets.CREATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {
            subject: input.subject,
            departmentId: input.departmentId,
            contactId: input.contactId
        };

        if (input.description !== undefined) {
            payload['description'] = input.description;
        }
        if (input.status !== undefined) {
            payload['status'] = input.status;
        }
        if (input.priority !== undefined) {
            payload['priority'] = input.priority;
        }
        if (input.assigneeId !== undefined) {
            payload['assigneeId'] = input.assigneeId;
        }
        if (input.category !== undefined) {
            payload['category'] = input.category;
        }
        if (input.subCategory !== undefined) {
            payload['subCategory'] = input.subCategory;
        }
        if (input.dueDate !== undefined) {
            payload['dueDate'] = input.dueDate;
        }
        if (input.channel !== undefined) {
            payload['channel'] = input.channel;
        }
        if (input.classification !== undefined) {
            payload['classification'] = input.classification;
        }
        if (input.language !== undefined) {
            payload['language'] = input.language;
        }
        if (input.teamId !== undefined) {
            payload['teamId'] = input.teamId;
        }
        if (input.productId !== undefined) {
            payload['productId'] = input.productId;
        }
        if (input.accountId !== undefined) {
            payload['accountId'] = input.accountId;
        }
        if (input.email !== undefined) {
            payload['email'] = input.email;
        }
        if (input.phone !== undefined) {
            payload['phone'] = input.phone;
        }
        if (input.resolution !== undefined) {
            payload['resolution'] = input.resolution;
        }
        if (input.customFields !== undefined) {
            payload['customFields'] = input.customFields;
        }
        if (input.cf !== undefined) {
            payload['cf'] = input.cf;
        }

        const response = await nango.post({
            // https://desk.zoho.com/DeskAPIDocument#Tickets#Tickets_Createaticket
            endpoint: '/v1/tickets',
            data: payload,
            retries: 3
        });

        const ticket = ProviderTicketSchema.parse(response.data);

        return {
            id: ticket.id,
            ...(ticket.ticketNumber !== undefined && { ticketNumber: ticket.ticketNumber }),
            ...(ticket.subject !== undefined && { subject: ticket.subject }),
            ...(ticket.description !== null && ticket.description !== undefined && { description: ticket.description }),
            ...(ticket.status !== null && ticket.status !== undefined && { status: ticket.status }),
            ...(ticket.statusType !== null && ticket.statusType !== undefined && { statusType: ticket.statusType }),
            ...(ticket.priority !== null && ticket.priority !== undefined && { priority: ticket.priority }),
            ...(ticket.departmentId !== undefined && { departmentId: ticket.departmentId }),
            ...(ticket.contactId !== null && ticket.contactId !== undefined && { contactId: ticket.contactId }),
            ...(ticket.assigneeId !== null && ticket.assigneeId !== undefined && { assigneeId: ticket.assigneeId }),
            ...(ticket.teamId !== null && ticket.teamId !== undefined && { teamId: ticket.teamId }),
            ...(ticket.accountId !== null && ticket.accountId !== undefined && { accountId: ticket.accountId }),
            ...(ticket.productId !== null && ticket.productId !== undefined && { productId: ticket.productId }),
            ...(ticket.email !== null && ticket.email !== undefined && { email: ticket.email }),
            ...(ticket.phone !== null && ticket.phone !== undefined && { phone: ticket.phone }),
            ...(ticket.category !== null && ticket.category !== undefined && { category: ticket.category }),
            ...(ticket.subCategory !== null && ticket.subCategory !== undefined && { subCategory: ticket.subCategory }),
            ...(ticket.dueDate !== null && ticket.dueDate !== undefined && { dueDate: ticket.dueDate }),
            ...(ticket.channel !== null && ticket.channel !== undefined && { channel: ticket.channel }),
            ...(ticket.classification !== null && ticket.classification !== undefined && { classification: ticket.classification }),
            ...(ticket.language !== null && ticket.language !== undefined && { language: ticket.language }),
            ...(ticket.resolution !== null && ticket.resolution !== undefined && { resolution: ticket.resolution }),
            ...(ticket.createdTime !== null && ticket.createdTime !== undefined && { createdTime: ticket.createdTime }),
            ...(ticket.modifiedTime !== null && ticket.modifiedTime !== undefined && { modifiedTime: ticket.modifiedTime }),
            ...(ticket.closedTime !== null && ticket.closedTime !== undefined && { closedTime: ticket.closedTime }),
            ...(ticket.webUrl !== null && ticket.webUrl !== undefined && { webUrl: ticket.webUrl }),
            ...(ticket.customFields !== null && ticket.customFields !== undefined && { customFields: ticket.customFields }),
            ...(ticket.cf !== null && ticket.cf !== undefined && { cf: ticket.cf })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
