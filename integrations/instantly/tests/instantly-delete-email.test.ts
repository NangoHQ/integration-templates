import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-email.js';

describe('instantly delete-email tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-email',
        Model: 'ActionOutput_instantly_deleteemail'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
