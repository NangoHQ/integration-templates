import { expect, it, describe } from 'vitest';

import createAction from '../actions/create-team-member.js';

describe('squareup create-team-member tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-team-member',
        Model: 'ActionOutput_squareup_createteammember'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
