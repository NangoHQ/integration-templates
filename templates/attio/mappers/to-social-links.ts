import type { AttioSocialLink } from "../models.js";
import type { AttioCompanyResponse, AttioPersonResponse } from '../types.js';

export function toSocialLinks<T extends AttioPersonResponse['values'] | AttioCompanyResponse['values']>(values: T): AttioSocialLink {
    const socialLinks: AttioSocialLink = {};
    socialLinks.linkedin = values.linkedin?.map((link) => link.value);
    socialLinks.twitter = values.twitter?.map((link) => link.value);
    socialLinks.facebook = values.facebook?.map((link) => link.value);
    socialLinks.instagram = values.instagram?.map((link) => link.value);
    socialLinks.angellist = values.angellist?.map((link) => link.value);

    return socialLinks;
}
