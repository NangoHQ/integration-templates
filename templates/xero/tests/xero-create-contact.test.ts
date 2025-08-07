import { expect, it, describe } from 'vitest';

import runAction from '../actions/create-contact.js';

describe('xero create-contact tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-contact',
        Model: 'ContactActionResponse'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await runAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
