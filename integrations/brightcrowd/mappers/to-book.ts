import type { Book } from '../../models';
import type { BrightCrowdBook, Question, QuestionField } from '../types';

/**
 * Maps a BrightCrowdBook object to a Book object.
 *
 * @param {BrightCrowdBook} data - The BrightCrowdBook object to be mapped.
 * @returns {Book} The mapped Book object.
 *
 */
export const toBook = (data: BrightCrowdBook): Book => ({
    id: data.id,
    uri: data.uri,
    userUri: data.userUri,
    alias: data.alias,
    organizationUri: data.organizationUri,
    baUri: data.baUri,
    name: data.name,
    pictureId: data.pictureId || null,
    bookTemplateUri: data.bookTemplateUri,
    config: data.config || null,
    coverPictureId: data.coverPictureId || null,
    bannerPictureId: data.bannerPictureId || null,
    affiliation: data.affiliation
        ? {
              type: data.affiliation.type || 'OtherAffiliation',
              organization: data.affiliation.organization ?? null,
              major: Array.isArray(data.affiliation.major) ? data.affiliation.major : [],
              degree: Array.isArray(data.affiliation.degree) ? data.affiliation.degree : [],
              school: Array.isArray(data.affiliation.school) ? data.affiliation.school : [],
              graduationYear: data.affiliation.graduationYear ?? null,
              specialty: Array.isArray(data.affiliation.specialty) ? data.affiliation.specialty : [],
              category: Array.isArray(data.affiliation.category) ? data.affiliation.category : [],
              title: data.affiliation.title || '',
              startYear: data.affiliation.startYear ?? null,
              endYear: data.affiliation.endYear ?? null,
              office: Array.isArray(data.affiliation.office) ? data.affiliation.office : [],
              group: Array.isArray(data.affiliation.group) ? data.affiliation.group : []
          }
        : null,
    questions: Array.isArray(data.questions) ? data.questions.map(mapQuestion) : [],
    flags: Array.isArray(data.flags) ? data.flags : [],
    publishedAt: data.publishedAt ?? null,
    closedAt: data.closedAt ?? null,
    lockedAt: data.lockedAt ?? null,
    created: data.created,
    modified: data.modified
});

const mapQuestionField = (field: any): QuestionField => ({
    id: field?.id || '',
    label: field?.label || '',
    type: field?.type || 'short-text',
    placeholder: field?.placeholder,
    active: field?.active || false,
    required: field?.required || false,
    maxcount: field?.maxcount,
    maxlength: field?.maxlength,
    allowMentions: field?.allowMentions || false,
    customizable: field?.customizable || false,
    keywordId: field?.keywordId,
    options: field?.options || []
});

const mapQuestion = (question: any): Question => ({
    id: question?.id || '',
    type: question?.type || 'Question',
    name: question?.name || '',
    description: question?.description || '',
    warning: question?.warning,
    route: question?.route || '',
    questionHeader: question?.questionHeader,
    questionSubheader: question?.questionSubheader,
    headline: question?.headline,
    active: question?.active || false,
    required: question?.required || false,
    adminOnly: question?.adminOnly || false,
    fields: Array.isArray(question?.fields) ? question.fields.map(mapQuestionField) : []
});
