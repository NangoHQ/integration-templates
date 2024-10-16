import type { Deal, AssociationCompany, AssociationContact, UpdateDealInput, CreateUpdateDealOutput, CreateDealInput } from '../../models';
import type { HubSpotDeal, HubSpotDealNonNull, HubSpotDealNonUndefined } from '../types';

export function toDeal(deal: HubSpotDealNonUndefined, contacts?: AssociationContact[] | undefined, companies?: AssociationCompany[] | undefined): Deal {
    const mappedCompanies: AssociationCompany[] = (companies || []).map((company) => ({
        id: company.id,
        name: company.name
    }));

    const mappedContacts: AssociationContact[] = (contacts || []).map((contact) => ({
        id: contact.id,
        first_name: contact.first_name,
        last_name: contact.last_name
    }));

    const dealObject: Deal = {
        id: deal.id,
        name: deal.properties.dealname,
        amount: deal.properties.amount,
        close_date: deal.properties.closedate,
        deal_description: deal.properties.description,
        owner: deal.properties.hubspot_owner_id,
        deal_stage: deal.properties.dealstage,
        deal_probability: deal.properties.hs_deal_stage_probability,
        returned_associations: {
            companies: mappedCompanies,
            contacts: mappedContacts
        }
    };

    if (mappedCompanies.length > 0 || mappedContacts.length > 0) {
        dealObject.returned_associations = {
            companies: mappedCompanies,
            contacts: mappedContacts
        };
    }

    return dealObject;
}

export function createUpdateDeal(deal: HubSpotDealNonNull): CreateUpdateDealOutput {
    return {
        id: deal.id,
        name: deal.properties.dealname,
        amount: deal.properties.amount,
        close_date: deal.properties.closedate,
        deal_description: deal.properties.description,
        owner: deal.properties.hubspot_owner_id,
        deal_stage: deal.properties.dealstage,
        deal_probability: deal.properties.hs_deal_stage_probability
    };
}

export function toHubspotDeal(deal: CreateDealInput | UpdateDealInput): Partial<HubSpotDeal> {
    const hubSpotDeal: Partial<HubSpotDeal> = {
        properties: {}
    };

    if (deal.name) {
        hubSpotDeal.properties!.dealname = deal.name;
    }

    if (deal.amount) {
        hubSpotDeal.properties!.amount = deal.amount;
    }

    if (deal.close_date) {
        hubSpotDeal.properties!.closedate = deal.close_date;
    }

    if (deal.deal_description) {
        hubSpotDeal.properties!.description = deal.deal_description;
    }

    if (deal.owner) {
        hubSpotDeal.properties!.hubspot_owner_id = deal.owner;
    }

    if (deal.deal_stage) {
        hubSpotDeal.properties!.dealstage = deal.deal_stage;
    }

    if (deal.deal_probability) {
        hubSpotDeal.properties!.hs_deal_stage_probability = deal.deal_probability;
    }

    if (deal.associations) {
        hubSpotDeal.associations = deal.associations.map((association) => ({
            to: {
                id: association.to
            },
            types: association.types.map((type) => ({
                associationCategory: type.association_category,
                associationTypeId: type.association_type_Id
            }))
        }));
    }

    return hubSpotDeal;
}
