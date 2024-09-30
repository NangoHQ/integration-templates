interface ArticleContent {
    type: string | null;
    title: string;
    description: string;
    body: string;
    author_id: number;
    state: string;
    created_at: number;
    updated_at: number;
    url: string;
}

interface TranslatedContent {
    type: string | null;
    ar: ArticleContent | null;
    bg: ArticleContent | null;
    bs: ArticleContent | null;
    ca: ArticleContent | null;
    cs: ArticleContent | null;
    da: ArticleContent | null;
    de: ArticleContent | null;
    el: ArticleContent | null;
    en: ArticleContent | null;
    es: ArticleContent | null;
    et: ArticleContent | null;
    fi: ArticleContent | null;
    fr: ArticleContent | null;
    he: ArticleContent | null;
    hr: ArticleContent | null;
    hu: ArticleContent | null;
    id: ArticleContent | null;
    it: ArticleContent | null;
    ja: ArticleContent | null;
    ko: ArticleContent | null;
    lt: ArticleContent | null;
    lv: ArticleContent | null;
    mn: ArticleContent | null;
    nb: ArticleContent | null;
    nl: ArticleContent | null;
    pl: ArticleContent | null;
    pt: ArticleContent | null;
    ro: ArticleContent | null;
    ru: ArticleContent | null;
    sl: ArticleContent | null;
    sr: ArticleContent | null;
    sv: ArticleContent | null;
    tr: ArticleContent | null;
    vi: ArticleContent | null;
    'pt-BR': ArticleContent | null;
    'zh-CN': ArticleContent | null;
    'zh-TW': ArticleContent | null;
}

export interface IntercomArticle {
    type: string;
    id: string;
    workspace_id: string;
    title: string;
    description: string | null;
    body: string | null;
    author_id: number;
    state: string;
    created_at: number;
    updated_at: number;
    url: string | null;
    parent_id: number | null;
    parent_ids: number[];
    parent_type: string | null;
    default_locale?: string;
    translated_content: TranslatedContent | null;
}
