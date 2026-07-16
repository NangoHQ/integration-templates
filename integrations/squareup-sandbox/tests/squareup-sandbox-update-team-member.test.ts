import { expect, it, describe } from 'vitest';

import createAction from '../actions/update-team-member.js';

describe('squareup-sandbox update-team-member tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-team-member',
        Model: 'ActionOutput_squareup_sandbox_updateteammember'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
