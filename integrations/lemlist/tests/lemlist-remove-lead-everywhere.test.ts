import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-lead-everywhere.js';

describe('lemlist remove-lead-everywhere tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-lead-everywhere',
        Model: 'ActionOutput_lemlist_removeleadeverywhere'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
