import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-page.js';

describe('notion create-page tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-page',
        Model: 'ActionOutput_notion_createpage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
