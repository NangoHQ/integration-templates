import type { Page } from '../../models';
import type { BrightCrowdPage } from '../types';

/**
 * Maps a BrightCrowdPage object to a Page object.
 *
 * @param {BrightCrowdPage} data - The BrightCrowdPage object to be mapped.
 * @returns {Page} The mapped Page object.
 *
 */
export const toPage = (data: BrightCrowdPage): Page => ({
    id: data.id,
    alias: data.alias,
    name: data.name,
    status: data.status,
    content: {
        firstName: data.content.firstName,
        lastName: data.content.lastName,
        previousName: data.content.previousName ?? null,
        suffix: data.content.suffix ?? '',
        partnerFirstName: data.content.partnerFirstName ?? null,
        partnerLastName: data.content.partnerLastName ?? null,
        pronouns: data.content.pronouns ?? '',
        pictureId: data.content.pictureId ?? null,
        audioId: data.content.audioId ?? null
    },
    pictures: data.pictures ?? null,
    videos: data.videos ?? null,
    tagUsers: data.tagUsers ?? [],
    homeTown: data.homeTown?.name ?? null,
    currentCity: data.currentCity?.name ?? null,
    campusResidence: data.campusResidence ?? null,
    affiliations: data.affiliations ?? [],
    plan: data.plan ?? 'other',
    created: data.created,
    modifiedByUserAt: data.modifiedByUserAt ?? null,
    completedByUserAt: data.completedByUserAt ?? null,
    externalId: data.externalId ?? ''
});
