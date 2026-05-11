import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-data-source.js';

describe('notion update-data-source tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-data-source',
        Model: 'ActionOutput_notion_updatedatasource'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
