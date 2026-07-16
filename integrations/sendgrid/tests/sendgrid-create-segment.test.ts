import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-segment.js';

describe('sendgrid create-segment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-segment',
        Model: 'ActionOutput_sendgrid_createsegment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
