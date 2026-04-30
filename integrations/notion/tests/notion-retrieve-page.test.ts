import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/retrieve-page.js';

describe('notion retrieve-page tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'retrieve-page',
        Model: 'ActionOutput_notion_retrievepage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
