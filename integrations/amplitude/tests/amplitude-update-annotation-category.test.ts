import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-annotation-category.js';

describe('amplitude update-annotation-category tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-annotation-category',
        Model: 'ActionOutput_amplitude_updateannotationcategory'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
