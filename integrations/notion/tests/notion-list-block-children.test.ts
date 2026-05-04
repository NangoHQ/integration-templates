import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-block-children.js';

describe('notion list-block-children tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-block-children',
        Model: 'ActionOutput_notion_listblockchildren'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
