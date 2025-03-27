import type { NangoAction, PennylaneIndividualCustomer, PennylaneSuccessResponse, UpdatePennylaneCustomer } from '../../models.js';

export default async function runAction(nango: NangoAction, input: Partial<UpdatePennylaneCustomer>): Promise<PennylaneSuccessResponse> {
    if (!input.id) {
        throw new nango.ActionError({
            message: 'id (customer source_id) is a required field'
        });
    }

    type updateData = Omit<UpdatePennylaneCustomer, 'id'>;
    const filtered: updateData = { ...input };

    const postData = {
        customer: {
            ...filtered
        }
    };

    const { data } = await nango.put<{ customer: Partial<PennylaneIndividualCustomer> }>({
        // https://pennylane.readme.io/reference/customers-id-put-1
        endpoint: `/api/external/v1/customers/${input.id}`,
        data: postData,
        retries: 3
    });

    return {
        success: true,
        source_id: data.customer.source_id!
    };
}
