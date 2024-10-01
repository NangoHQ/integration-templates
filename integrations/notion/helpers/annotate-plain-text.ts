import type { Annotations } from '../types';
import { underline, strikethrough, italic, inlineCode, bold } from './object-mapping.js';

export const annotatePlainText = (text: string, annotations: Annotations): string => {
    if (text.match(/^\s*$/)) {
        return text;
    }

    const leadingSpaceMatch = text.match(/^(\s*)/);
    const trailingSpaceMatch = text.match(/(\s*)$/);
    const leading_space = leadingSpaceMatch ? leadingSpaceMatch[0] : '';
    const trailing_space = trailingSpaceMatch ? trailingSpaceMatch[0] : '';

    text = text.trim();

    if (text !== '') {
        if (annotations.code) {
            text = inlineCode(text);
        }
        if (annotations.bold) {
            text = bold(text);
        }
        if (annotations.italic) {
            text = italic(text);
        }
        if (annotations.strikethrough) {
            text = strikethrough(text);
        }
        if (annotations.underline) {
            text = underline(text);
        }
    }

    return leading_space + text + trailing_space;
};
