import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-workspace-murals.js';

describe('mural list-workspace-murals tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-workspace-murals',
        Model: 'ActionOutput_mural_listworkspacemurals'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
