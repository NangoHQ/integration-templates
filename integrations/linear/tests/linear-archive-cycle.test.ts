import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/archive-cycle.js';

describe('linear archive-cycle tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'archive-cycle',
        Model: 'ActionOutput_linear_archivecycle'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
