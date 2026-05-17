import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-user.js';

describe('calendly create-user tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-user',
        Model: 'ActionOutput_calendly_createuser'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
