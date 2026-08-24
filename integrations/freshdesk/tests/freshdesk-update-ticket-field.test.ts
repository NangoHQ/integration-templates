import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-ticket-field.js';

describe('freshdesk update-ticket-field tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-ticket-field',
        Model: 'ActionOutput_freshdesk_updateticketfield'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
