import { NangoSync } from "nango";
import type { Location } from ../models.js;
import type { ResponseWorkdayLocation } from '../types.js';

export async function locationToLocation(loc: ResponseWorkdayLocation, nango: NangoSync): Promise<Location | null> {
    const data = loc.Location_Data;
    const contact = data.Contact_Data;
    if (!contact) {
        await nango.log(`Skipping location without contact data (${data.Location_ID})`, { level: 'warn' });
        return null;
    }

    const address = contact.Address_Data && contact.Address_Data.length > 0 ? contact.Address_Data[0] : null;
    if (!address) {
        await nango.log(`Skipping location without address (${data.Location_ID})`, {
            level: 'warn'
        });
        return null;
    }

    const phone = contact.Phone_Data && contact.Phone_Data.length > 0 ? contact.Phone_Data[0] : null;

    const line1 = address.Address_Line_Data.find((line) => line.attributes['wd:Type'] === 'ADDRESS_LINE_1');
    const line2 = address.Address_Line_Data.find((line) => line.attributes['wd:Type'] === 'ADDRESS_LINE_2');
    const countryIso = address.Country_Reference.ID.find((id) => id.attributes['wd:type'] === 'ISO_3166-1_Alpha-2_Code');
    const stateIso = address.Country_Region_Reference && address.Country_Region_Reference.ID.find((id) => id.attributes['wd:type'] === 'ISO_3166-2_Code');
    if (!countryIso || !line1) {
        await nango.log(`Skipping location without proper address (${data.Location_ID})`, { level: 'warn' });
        return null;
    }

    const location: Location = {
        id: loc.Location_Reference.ID.find((id) => id.attributes['wd:type'] === 'WID')!.$value,
        name: data.Location_Name,
        description: null,
        address: [line1.$value, line2 ? line2.$value : null].join('\n'),
        city: address.Municipality || null,
        zip_code: address.Postal_Code ? address.Postal_Code : '',
        state: stateIso
            ? {
                  name: address.Country_Region_Descriptor || '',
                  abbrev: '',
                  iso_code: stateIso.$value
              }
            : null,
        country: {
            name: '', // Workday doesn't provide iso -> name in the payload
            iso_code: countryIso.$value
        },
        phone_number: phone ? phone.attributes['wd:International_Formatted_Phone'] : null
    };

    return location;
}
