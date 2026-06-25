import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-dubbing-projects.js';

describe('elevenlabs list-dubbing-projects tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-dubbing-projects',
        Model: 'ActionOutput_elevenlabs_listdubbingprojects'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
