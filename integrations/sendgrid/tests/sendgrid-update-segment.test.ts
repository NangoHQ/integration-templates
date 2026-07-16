import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-segment.js';

describe('sendgrid update-segment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-segment',
        Model: 'ActionOutput_sendgrid_updatesegment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
