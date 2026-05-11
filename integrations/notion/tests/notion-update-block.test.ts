import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-block.js';

describe('notion update-block tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-block',
        Model: 'ActionOutput_notion_updateblock'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
