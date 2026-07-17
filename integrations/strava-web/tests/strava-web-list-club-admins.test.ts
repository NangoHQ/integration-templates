import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-club-admins.js';

describe('strava-web list-club-admins tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-club-admins',
        Model: 'ActionOutput_strava_web_listclubadmins'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
