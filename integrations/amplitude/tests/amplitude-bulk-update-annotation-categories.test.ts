import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/bulk-update-annotation-categories.js';

describe('amplitude bulk-update-annotation-categories tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'bulk-update-annotation-categories',
        Model: 'ActionOutput_amplitude_bulkupdateannotationcategories'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
