import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-page-as-markdown.js';

describe('notion get-page-as-markdown tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-page-as-markdown',
        Model: 'ActionOutput_notion_getpageasmarkdown'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
