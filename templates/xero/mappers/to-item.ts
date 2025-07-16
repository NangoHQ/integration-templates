import type { FailedItem, Item } from ../models.js;
import type { Item as XeroItem } from '../types.js';

export function toItem(xeroItem: XeroItem): Item {
    const item: Item = {
        id: xeroItem.ItemID,
        item_code: xeroItem.Code,
        name: xeroItem.Name || xeroItem.Code,
        description: xeroItem.Description || null,
        account_code: xeroItem.SalesDetails ? xeroItem.SalesDetails['AccountCode'] : null
    };

    return item;
}

export function toXeroItem(item: Item) {
    const xeroItem: Record<string, any> = {
        Code: item.item_code
    };

    if (item.id) {
        xeroItem['ItemID'] = item.id;
    }

    if (item.name) {
        xeroItem['Name'] = item.name;
    }

    if (item.description) {
        xeroItem['Description'] = item.description;
    }

    if (item.account_code) {
        xeroItem['SalesDetails'] = {
            AccountCode: item.account_code
        };
    }

    return xeroItem;
}

export function toFailedItem(xeroItem: XeroItem): FailedItem {
    return {
        ...toItem(xeroItem),
        validation_errors: xeroItem?.ValidationErrors || []
    };
}
