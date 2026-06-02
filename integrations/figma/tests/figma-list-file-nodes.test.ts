import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-file-nodes.js';

describe('figma list-file-nodes tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-file-nodes',
        Model: 'ActionOutput_figma_listfilenodes'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
