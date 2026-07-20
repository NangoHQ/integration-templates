import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-suppression-group.js';

describe('sendgrid create-suppression-group tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-suppression-group',
        Model: 'ActionOutput_sendgrid_createsuppressiongroup'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
