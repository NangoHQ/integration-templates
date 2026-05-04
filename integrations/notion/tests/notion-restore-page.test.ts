import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/restore-page.js';

describe('notion restore-page tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'restore-page',
        Model: 'ActionOutput_notion_restorepage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
