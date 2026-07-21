import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-inbound-domain.js';

describe('mandrill add-inbound-domain tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-inbound-domain',
        Model: 'ActionOutput_mandrill_addinbounddomain'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
