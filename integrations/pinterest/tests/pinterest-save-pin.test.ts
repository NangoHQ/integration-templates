import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/save-pin.js';

describe('pinterest save-pin tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'save-pin',
        Model: 'ActionOutput_pinterest_savepin'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
