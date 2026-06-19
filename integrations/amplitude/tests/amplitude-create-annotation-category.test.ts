import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-annotation-category.js';

describe('amplitude create-annotation-category tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-annotation-category',
        Model: 'ActionOutput_amplitude_createannotationcategory'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
