import type { Opportunity, CreateOpportunityInput, UpdateOpportunityInput } from '../../models';
import type { SalesforceOpportunity } from '../types';

export function toOpportunity(opportunity: SalesforceOpportunity): Opportunity {
    return {
        id: opportunity.Id,
        opportunity_name: opportunity.Name,
        account_name: opportunity.Account ? opportunity.Account.Name : null,
        account_id: opportunity.Account ? opportunity.AccountId : null,
        amount: opportunity.Amount,
        description: opportunity.Description,
        close_date: opportunity.CloseDate,
        created_by_id: opportunity.CreatedById,
        created_by: opportunity.CreatedBy.Name,
        owner_id: opportunity.OwnerId,
        owner_name: opportunity.Owner.Name,
        stage: opportunity.StageName,
        probability: opportunity.Probability,
        type: opportunity.Type,
        last_modified_date: opportunity.LastModifiedDate,
    };
}

export function toSalesForceOpportunity(opportunity: CreateOpportunityInput | UpdateOpportunityInput): Partial<SalesforceOpportunity> {
    const salesforceOpportunity: Partial<SalesforceOpportunity> = {};

    if (opportunity.opportunity_name) {
        salesforceOpportunity.Name = opportunity.opportunity_name;
    }

    if (opportunity.account_id) {
        salesforceOpportunity.AccountId = opportunity.account_id;
    }

    if (opportunity.amount) {
        salesforceOpportunity.Amount = opportunity.amount;
    }

    if (opportunity.description) {
        salesforceOpportunity.Description = opportunity.description;
    }

    if (opportunity.close_date) {
        salesforceOpportunity.CloseDate = opportunity.close_date;
    }

    if (opportunity.created_by_id) {
        salesforceOpportunity.CreatedById = opportunity.created_by_id;
    }

    if (opportunity.owner_id) {
        salesforceOpportunity.OwnerId = opportunity.owner_id;
    }

    if (opportunity.stage) {
        salesforceOpportunity.StageName = opportunity.stage;
    }

    if (opportunity.probability) {
        salesforceOpportunity.Probability = opportunity.probability;
    }

    if (opportunity.type) {
        salesforceOpportunity.Type = opportunity.type;
    }

    return salesforceOpportunity;
}
