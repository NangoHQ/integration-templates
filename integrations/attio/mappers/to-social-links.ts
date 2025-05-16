import { AttioSocialLink } from '../../models.js';
import type { AttioCompanyResponse, AttioPersonResponse } from '../types.js';

export function toCompanySocialLinks(values: AttioCompanyResponse['values']): AttioSocialLink {
    const socialLinks: AttioSocialLink = {};
    socialLinks.linkedin = values.linkedin?.map((link) => link.value);
    socialLinks.twitter = values.twitter?.map((link) => link.value);
    socialLinks.facebook = values.facebook?.map((link) => link.value);
    socialLinks.instagram = values.instagram?.map((link) => link.value);
    socialLinks.angellist = values.angellist?.map((link) => link.value);

    return socialLinks;
}

export function toPersonSocialLinks(values: AttioPersonResponse['values']): AttioSocialLink {
    const socialLinks: AttioSocialLink = {};
    socialLinks.linkedin = values.linkedin?.map((link) => link.value);
    socialLinks.twitter = values.twitter?.map((link) => link.value);
    socialLinks.facebook = values.facebook?.map((link) => link.value);
    socialLinks.instagram = values.instagram?.map((link) => link.value);
    socialLinks.angellist = values.angellist?.map((link) => link.value);

    return socialLinks;
}
