import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-macro.js';

describe('gorgias update-macro tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-macro',
        Model: 'ActionOutput_gorgias_updatemacro'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
