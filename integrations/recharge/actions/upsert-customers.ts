import type { NangoAction, UpsertRechargeCustomerOutput, UpsertRechargeCustomerInput, ProxyConfiguration } from '../../models';
import type { RechargeCustomer } from '../types';
import { upsertRechargeCustomerInputSchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: UpsertRechargeCustomerInput): Promise<UpsertRechargeCustomerOutput> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: upsertRechargeCustomerInputSchema, input });

    const { first_name, last_name, email, external_customer_id, phone, tax_exempt } = parsedInput.data;

    // @allowTryCatch
    try {
        const createConfig: ProxyConfiguration = {
            // https://developer.rechargepayments.com/2021-11/customers/customers_create
            endpoint: '/customers',
            data: {
                first_name,
                last_name,
                email,
                phone,
                external_customer_id,
                tax_exempt
            },
            retries: 10
        };

        const createResponse = await nango.post<{ customer: RechargeCustomer }>(createConfig);
        const createCustomer: UpsertRechargeCustomerOutput = {
            action: 'create',
            response: createResponse.data.customer
        };

        return createCustomer;
    } catch (error: any) {
        if (
            error.response?.status === 400 &&
            typeof error.response?.data?.errors?.email === 'string' &&
            error.response.data.errors.email.includes('email already exists')
        ) {
            const existingCustomerConfig: ProxyConfiguration = {
                // https://developer.rechargepayments.com/2021-11/customers/customers_retrieve
                endpoint: '/customers',
                retries: 10,
                params: {
                    email
                }
            };
            const existingCustomerResponse = await nango.get<{ customers: RechargeCustomer[] }>(existingCustomerConfig);
            const existingCustomer = existingCustomerResponse.data.customers[0];

            if (!existingCustomer?.id) {
                throw new nango.ActionError({
                    message: 'Customer exists but ID could not be retrieved'
                });
            }

            const updateConfig: ProxyConfiguration = {
                // https://developer.rechargepayments.com/2021-11/customers/customers_update
                endpoint: `/customers/${existingCustomer.id}`,
                data: {
                    first_name,
                    last_name,
                    phone,
                    external_customer_id,
                    tax_exempt
                },
                retries: 10
            };
            const updateResponse = await nango.put<{ customer: RechargeCustomer }>(updateConfig);
            const updateCustomer: UpsertRechargeCustomerOutput = {
                action: 'update',
                response: updateResponse.data.customer
            };

            return updateCustomer;
        }
        const errorMessage = error.response?.data ? JSON.stringify(error.response.data, null, 2) : error.message || 'Unknown error occurred';
        throw new nango.ActionError({
            message: 'Failed to create customers',
            details: errorMessage
        });
    }
}
