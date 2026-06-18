import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-event-category.js';

describe('amplitude delete-event-category tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-event-category',
        Model: 'ActionOutput_amplitude_deleteeventcategory'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
