import type { Affiliation, Book, Question, QuestionField, FrontMatterSection } from '../../models';
import type { BrightCrowdBook, BrightCrowdQuestion, BrightCrowdQuestionField, BrightCrowdAffiliation } from '../types';

/**
 * Maps a BrightCrowdBook object to a Book object.
 *
 * @param {BrightCrowdBook} data - The BrightCrowdBook object to be mapped.
 * @returns {Book} The mapped Book object.
 *
 */
export const toBook = (data: BrightCrowdBook): Book => ({
    id: data.id,
    alias: data.alias,
    name: data.name,
    pictureId: data.pictureId || null,
    config: data.config || null,
    coverPictureId: data.coverPictureId || null,
    bannerPictureId: data.bannerPictureId || null,
    frontMatter: data.frontMatter?.sections
        ? {
              sections: Array.isArray(data.frontMatter.sections) ? data.frontMatter.sections.map(mapFrontMatterSection) : []
          }
        : null,
    affiliation: data.affiliation ? mapAffiliation(data.affiliation) : null,
    questions: Array.isArray(data.questions) ? data.questions.map(mapQuestion) : [],
    flags: Array.isArray(data.flags) ? data.flags : [],
    publishedAt: data.publishedAt ?? null,
    closedAt: data.closedAt ?? null,
    lockedAt: data.lockedAt ?? null,
    created: data.created,
    modified: data.modified
});
const mapFrontMatterSection = (section: FrontMatterSection) => ({
    uri: section.uri,
    title: section.title || '',
    snippet: section.snippet || '',
    disabled: section.disabled || false
});

const mapAffiliation = (affiliation: Affiliation): BrightCrowdAffiliation => ({
    type: affiliation.type || 'OtherAffiliation',
    organization: affiliation.organization ?? null,
    major: Array.isArray(affiliation.major) ? affiliation.major : [],
    degree: Array.isArray(affiliation.degree) ? affiliation.degree : [],
    school: Array.isArray(affiliation.school) ? affiliation.school : [],
    graduationYear: affiliation.graduationYear ?? null,
    specialty: Array.isArray(affiliation.specialty) ? affiliation.specialty : [],
    category: Array.isArray(affiliation.category) ? affiliation.category : [],
    title: affiliation.title || '',
    startYear: affiliation.startYear ?? null,
    endYear: affiliation.endYear ?? null,
    office: Array.isArray(affiliation.office) ? affiliation.office : [],
    group: Array.isArray(affiliation.group) ? affiliation.group : []
});

const mapQuestionField = (field: QuestionField): BrightCrowdQuestionField => ({
    id: field?.id,
    label: field?.label || '',
    type: field?.type || 'short-text',
    placeholder: field?.placeholder || '',
    headline: field?.headline || '',
    active: field?.active || false,
    required: field?.required || false,
    maxcount: field?.maxcount || 0,
    maxlength: field?.maxlength || 0,
    allowMentions: field?.allowMentions || false,
    customizable: field?.customizable || false
});

const mapQuestion = (question: Question): BrightCrowdQuestion => ({
    id: question.id,
    type: question?.type || 'short-text',
    name: question?.name || '',
    description: question?.description || '',
    warning: question?.warning || '',
    route: question?.route || '',
    questionHeader: question.questionHeader || '',
    questionSubheader: question?.questionSubheader || '',
    headline: question?.headline || '',
    active: question?.active || false,
    required: question?.required || false,
    adminOnly: question?.adminOnly || false,
    fields: Array.isArray(question?.fields) ? question.fields.map(mapQuestionField) : []
});
