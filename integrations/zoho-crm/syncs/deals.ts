import { createSync } from 'nango';
import { ZohoCRMDeal } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of deals/opportunities from zoho crm',
    version: '1.0.0',
    frequency: 'every half hour',
    autoStart: false,
    syncType: 'incremental',
    trackDeletes: false,

    endpoints: [
        {
            method: 'GET',
            path: '/zoho-crm/deals'
        }
    ],

    scopes: ['ZohoCRM.modules.deals.READ'],

    models: {
        ZohoCRMDeal: ZohoCRMDeal
    },

    metadata: z.object({}),

    exec: async (nango) => {
        let totalRecords = 0;
        const fields = ''; // Define your fields to retrieve specific field values

        // @allowTryCatch
        try {
            const endpoint = '/crm/v2/Deals';
            const config = {
                headers: {
                    'If-Modified-Since': nango.lastSyncDate?.toUTCString() || ''
                },
                paginate: {
                    limit: 100
                },
                ...(fields ? { params: { fields } } : {})
            };
            for await (const deal of nango.paginate({ ...config, endpoint })) {
                const mappedDeals: ZohoCRMDeal[] = deal.map(mapDeals) || [];
                // Save Deals
                const batchSize: number = mappedDeals.length;
                totalRecords += batchSize;

                await nango.log(`Saving batch of ${batchSize} deals (total deals: ${totalRecords})`);
                await nango.batchSave(mappedDeals, 'ZohoCRMDeal');
            }
        } catch (error: any) {
            if (Number(error.status) === 304) {
                await nango.log('No Deals found.');
            } else {
                throw new Error(`Error in fetchData: ${error.message}`);
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

function mapDeals(deal: any): ZohoCRMDeal {
    return {
        Owner: deal.Owner,
        Description: deal.Description,
        $currency_symbol: deal.$currency_symbol,
        Campaign_Source: deal.Campaign_Source,
        $field_states: deal.$field_states,
        $review_process: deal.$review_process,
        Closing_Date: deal.Closing_Date,
        Reason_For_Loss__s: deal.Reason_For_Loss__s,
        Last_Activity_Time: deal.Last_Activity_Time,
        Modified_By: deal.Modified_By,
        $review: deal.$review,
        Lead_Conversion_Time: deal.Lead_Conversion_Time,
        $state: deal.$state,
        $process_flow: deal.$process_flow,
        Deal_Name: deal.Deal_Name,
        Expected_Revenue: deal.Expected_Revenue,
        Overall_Sales_Duration: deal.Overall_Sales_Duration,
        Stage: deal.Stage,
        $locked_for_me: deal.$locked_for_me,
        Account_Name: deal.Account_Name,
        id: deal.id,
        $approved: deal.$approved,
        $approval: deal.$approval,
        Modified_Time: deal.Modified_Time,
        Created_Time: deal.Created_Time,
        Amount: deal.Amount,
        Next_Step: deal.Next_Step,
        Probability: deal.Probability,
        $editable: deal.$editable,
        $orchestration: deal.$orchestration,
        Contact_Name: deal.Contact_Name,
        Sales_Cycle_Duration: deal.Sales_Cycle_Duration,
        Type: deal.Type,
        $in_merge: deal.$in_merge,
        Locked__s: deal.Locked__s,
        Lead_Source: deal.Lead_Source,
        Created_By: deal.Created_By,
        Tag: deal.Tag,
        $zia_owner_assignment: deal.$zia_owner_assignment,
        $approval_state: deal.$approval_state
    };
}
