import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-building.js';

describe('ingenious-build get-building tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-building',
        Model: 'ActionOutput_ingenious_build_getbuilding'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
