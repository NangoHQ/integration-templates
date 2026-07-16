import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-suppression-group.js';

describe('sendgrid update-suppression-group tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-suppression-group',
        Model: 'ActionOutput_sendgrid_updatesuppressiongroup'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
