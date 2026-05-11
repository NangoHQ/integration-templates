import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/retrieve-data-source.js';

describe('notion retrieve-data-source tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'retrieve-data-source',
        Model: 'ActionOutput_notion_retrievedatasource'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
