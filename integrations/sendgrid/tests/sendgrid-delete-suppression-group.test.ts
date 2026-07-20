import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-suppression-group.js';

describe('sendgrid delete-suppression-group tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-suppression-group',
        Model: 'ActionOutput_sendgrid_deletesuppressiongroup'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
