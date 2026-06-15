import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-leave-request.js';

describe('zoho-people create-leave-request tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-leave-request',
        Model: 'ActionOutput_zoho_people_createleaverequest'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
