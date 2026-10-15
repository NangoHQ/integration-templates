import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-text-box.js';

describe('mural update-text-box tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-text-box',
        Model: 'ActionOutput_mural_updatetextbox'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
