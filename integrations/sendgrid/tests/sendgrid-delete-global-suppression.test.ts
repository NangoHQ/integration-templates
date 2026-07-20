import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-global-suppression.js';

describe('sendgrid delete-global-suppression tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-global-suppression',
        Model: 'ActionOutput_sendgrid_deleteglobalsuppression'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
