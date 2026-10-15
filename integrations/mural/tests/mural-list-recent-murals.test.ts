import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-recent-murals.js';

describe('mural list-recent-murals tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-recent-murals',
        Model: 'ActionOutput_mural_listrecentmurals'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
