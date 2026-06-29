import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-dubbing-project.js';

describe('elevenlabs delete-dubbing-project tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-dubbing-project',
        Model: 'ActionOutput_elevenlabs_deletedubbingproject'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
