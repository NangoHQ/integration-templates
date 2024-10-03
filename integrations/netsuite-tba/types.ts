export interface NSAPI_GetResponse<T> {
    data: T;
}

export interface NS_Address {
    addr1?: string;
    addr2?: string;
    city?: string;
    zip?: string;
    country?: { id: string };
    state?: { id: string };
}

export interface NS_Customer {
    id: string;
    externalId?: string;
    companyName: string;
    email?: string;
    defaultTaxReg?: string;
    phone?: string;
    addressBook: {
        items: {
            addressBookAddress: NS_Address;
        }[];
    };
}

export interface NS_Item {
    item?: {
        id: string;
        refName: string;
    };
    location?: {
        id: string;
        refName: string;
    };
    quantity?: number;
    amount?: number;
    taxDetailsReference?: string;
}

export interface NS_Invoice {
    id: string;
    entity?: {
        id: string;
        name?: string;
    };
    currency?: {
        id?: string;
        refName?: string;
    };
    memo?: string;
    tranDate?: string;
    total?: string;
    status?: {
        id: string;
        refName?: string;
    };
    item: {
        items: NS_Item[];
    };
}

export interface NS_CreditNote {
    id: string;
    entity?: {
        id: string;
    };
    currency?: {
        id?: string;
        refName?: string;
    };
    memo?: string;
    tranDate?: string;
    total?: string;
    status?: {
        id: string;
        refName?: string;
    };
    item: {
        items: NS_Item[];
    };
}

export interface NS_Payment {
    id: string;
    memo?: string;
    customer?: {
        id: string;
    };
    payment?: number;
    tranDate?: string;
    currency?: {
        id?: string;
        refName?: string;
    };
    tranId?: string;
    status?: {
        id: string;
        refName?: string;
    };
    apply?: {
        items: { doc: { id: string } }[];
    };
}

export interface NS_Location {
  links: NS_Link[];
  classTranslation: NS_ClassTranslation;
  id: string;
  includeInControlTower: boolean;
  includeInSupplyPlanning: boolean;
  inventoryBalance: NS_InventoryBalance;
  isInactive: boolean;
  lastModifiedDate: string;
  mainAddress: NS_Location_Address;
  makeInventoryAvailable: boolean;
  makeInventoryAvailableStore: boolean;
  name: string;
  returnAddress: NS_ReturnAddress;
  subsidiary: NS_Subsidiary;
  timeZone: NS_TimeZone;
  useBins: boolean;
}

interface NS_Link {
  rel: string;
  href: string;
}

interface NS_ClassTranslation {
  links: NS_Link[];
  items: any[];
  totalResults: number;
}

interface NS_InventoryBalance {
  links: NS_Link[];
  items: any[];
  totalResults: number;
}

interface NS_Location_Address {
  links: NS_Link[];
  addr1: string;
  addressee: string;
  addrText: string;
  city: string;
  country: NS_Country;
  override: boolean;
  state: string;
  zip: string;
}

interface NS_Country {
  id: string;
  refName: string;
}

interface NS_ReturnAddress {
  links: NS_Link[];
  addrText: string;
  country: NS_Country;
  override: boolean;
}

interface NS_Subsidiary {
  links: NS_Link[];
  count: number;
  hasMore: boolean;
  items: NS_SubsidiaryItem[];
  offset: number;
  totalResults: number;
}

interface NS_SubsidiaryItem {
  links: NS_Link[];
  id: string;
  refName: string;
}

interface NS_TimeZone {
  id: string;
  refName: string;
}


