import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-data-source.js';

describe('notion create-data-source tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-data-source',
        Model: 'ActionOutput_notion_createdatasource'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
