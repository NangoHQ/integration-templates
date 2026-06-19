import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-annotation-category.js';

describe('amplitude get-annotation-category tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-annotation-category',
        Model: 'ActionOutput_amplitude_getannotationcategory'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
