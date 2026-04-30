import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/retrieve-block.js';

describe('notion retrieve-block tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'retrieve-block',
        Model: 'ActionOutput_notion_retrieveblock'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
