import type { NangoAction, ProxyConfiguration, Ticket, CreateTicketInput } from '../../models';
import { createTicketInputSchema } from '../schema.zod.js';
import type { GorgiasCustomerResponse, GorgiasSettingsResponse, TicketAssignmentData, GorgiasCustomersResponse, GorgiasTicketResponse } from '../types';
import { toTicket } from '../mappers/to-ticket.js';

export default async function runAction(nango: NangoAction, input: CreateTicketInput): Promise<Ticket> {
    await nango.zodValidateInput({ zodSchema: createTicketInputSchema, input });

    const customer = await findOrCreateCustomer(nango, input.customer.phone_number, input.customer.email);

    const channel = await checkSmsChannel(nango);

    const ticketData = {
        channel,
        created_datetime: new Date().toISOString(),
        customer: customer,
        from_agent: false,
        opened_datetime: new Date().toISOString(),
        messages: input.ticket.messages.map((message) => ({
            attachments: message.attachments || [],
            body_html: message.body_html,
            body_text: message.body_text,
            channel: 'phone',
            created_datetime: new Date().toISOString(),
            external_id: message.id,
            from_agent: false,
            sender: customer,
            via: 'api'
        }))
    };

    const config: ProxyConfiguration = {
        // https://developers.gorgias.com/reference/create-ticket
        endpoint: '/api/tickets',
        retries: 3,
        data: ticketData
    };

    const response = await nango.post<GorgiasTicketResponse>(config);

    return toTicket(response.data, response.data.messages);
}

/**
 * Finds an existing customer in Gorgias by email or phone, or creates a new one if no match is found.
 *
 * @param nango - An instance of NangoAction to handle API requests.
 * @param phone - The phone number to search for or associate with the customer.
 * @param email - The email address to search for or associate with the customer (optional).
 * @returns A Promise resolving to an object containing the customer's ID and email.
 */
async function findOrCreateCustomer(nango: NangoAction, phone: string, email?: string): Promise<{ id: number; email: string }> {
    let customer: GorgiasCustomerResponse | null = null;

    // First, check if email is provided and try to find the customer by email
    if (email) {
        const customerConfig: ProxyConfiguration = {
            // https://developers.gorgias.com/reference/list-customers
            endpoint: '/api/customers',
            retries: 3,
            params: { email }
        };

        const response = await nango.get<GorgiasCustomerResponse[]>(customerConfig);
        if (response.data.length === 0) {
            await nango.log(`No customer found with email: ${email}.`, { level: 'info' });
        } else {
            customer = response.data[0] || null;
        }
    }

    // If no customer was found by email, check by phone number
    if (!customer) {
        const config: ProxyConfiguration = {
            // https://developers.gorgias.com/reference/list-customers
            endpoint: '/api/customers',
            retries: 3,
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'meta.next_cursor',
                cursor_name_in_request: 'cursor',
                response_path: 'data',
                limit: 100,
                limit_name_in_request: 'limit'
            }
        };

        for await (const paginatedCustomers of nango.paginate<GorgiasCustomersResponse>(config)) {
            for (const customerData of paginatedCustomers) {
                const customerDetailConfig: ProxyConfiguration = {
                    // https://developers.gorgias.com/reference/get-customer
                    endpoint: `/api/customers/${customerData.id}`,
                    retries: 3
                };

                const customerDetailResponse = await nango.get<GorgiasCustomerResponse>(customerDetailConfig);
                const detailedCustomer = customerDetailResponse.data;

                const emailChannel = detailedCustomer.channels.find((channel) => channel.type === 'email' && channel.address === email);
                const phoneChannel = detailedCustomer.channels.find((channel) => channel.type === 'phone' && channel.address === phone);

                if (emailChannel || phoneChannel) {
                    customer = detailedCustomer;
                    break;
                }
            }

            if (customer) break;
        }
    }

    // If no customer found by email or phone, create a new one
    if (!customer) {
        await nango.log(`No customer found with phone: ${phone} or email: ${email}. Creating a new one.`, { level: 'info' });

        const newCustomer = await createNewCustomer(nango, phone, email);
        return { id: newCustomer.id, email: newCustomer.email };
    }

    return { id: customer.id, email: customer.email };
}
/**
 * Creates a new customer in Gorgias with the provided phone and/or email details.
 *
 * @param nango - An instance of NangoAction to perform the API request.
 * @param phone - The phone number of the customer (optional).
 * @param email - The email address of the customer (optional).
 * @returns A Promise resolving to the created customer object.
 */
async function createNewCustomer(nango: NangoAction, phone?: string, email?: string): Promise<GorgiasCustomerResponse> {
    const newCustomerData = {
        channels: [...(email ? [{ type: 'email', address: email }] : []), ...(phone ? [{ type: 'phone', address: phone }] : [])]
    };

    const createConfig: ProxyConfiguration = {
        // https://developers.gorgias.com/reference/create-customer//
        endpoint: '/api/customers',
        retries: 3,
        data: newCustomerData
    };

    const createResponse = await nango.post<GorgiasCustomerResponse>(createConfig);
    return createResponse.data;
}

/**
 * Checks if the SMS channel is enabled in Gorgias account settings.
 * If the SMS channel is found, it returns "phone"; otherwise, it defaults to "email".
 *
 * @param nango - An instance of NangoAction to perform API requests.
 * @returns A Promise resolving to "phone" if SMS is enabled, otherwise "email".
 */
async function checkSmsChannel(nango: NangoAction): Promise<'phone' | 'email'> {
    const config: ProxyConfiguration = {
        // https://developers.gorgias.com/reference/get-account
        endpoint: '/api/account/settings',
        retries: 3
    };

    const response = await nango.get<GorgiasSettingsResponse>(config);
    const settingsItems = response.data.data;

    for (const item of settingsItems) {
        if (item.type === 'ticket-assignment') {
            if (item.data && 'assignment_channels' in item.data) {
                if (isTicketAssignmentData(item.data)) {
                    if (item.data.assignment_channels.includes('sms')) {
                        return 'phone';
                    }
                }
            }
        }
    }

    return 'email';
}

function isTicketAssignmentData(data: TicketAssignmentData): data is TicketAssignmentData {
    return (
        data &&
        typeof data === 'object' &&
        Array.isArray(data.assignment_channels) &&
        data.assignment_channels.every((channel: any) => typeof channel === 'string')
    );
}
