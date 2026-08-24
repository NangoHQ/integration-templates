import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/make-contact-agent.js';

describe('freshdesk make-contact-agent tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'make-contact-agent',
        Model: 'ActionOutput_freshdesk_makecontactagent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
