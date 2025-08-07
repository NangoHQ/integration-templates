import type { GongCallOutput } from '../../models.js';
import type { GongCallExtensive } from '../types.js';

export function toCall(gongCall: GongCallExtensive): GongCallOutput {
    return {
        id: gongCall.metaData.id,
        url: gongCall.metaData.url,
        title: gongCall.metaData.title,
        scheduled: gongCall.metaData.scheduled,
        started: gongCall.metaData.started,
        duration: gongCall.metaData.duration,
        direction: gongCall.metaData.direction,
        scope: gongCall.metaData.scope,
        media: gongCall.metaData.media,
        language: gongCall.metaData.language,
        workspace_id: gongCall.metaData.workspaceId,
        purpose: gongCall.metaData.purpose,
        meeting_url: gongCall.metaData.meetingUrl,
        is_private: gongCall.metaData.isPrivate,
        calendar_event_id: gongCall.metaData.calendarEventId,
        context: {
            system: gongCall.context?.system ?? null,
            objects: gongCall.context?.objects
                ? {
                      object_type: gongCall.context.objects.objectType ?? null,
                      object_id: gongCall.context.objects.objectId ?? null,
                      fields: gongCall.context.objects.fields ?? []
                  }
                : undefined
        },
        parties: (gongCall.parties ?? []).map((party) => ({
            id: party.id,
            email_address: party.emailAddress,
            name: party.name,
            title: party.title,
            user_id: party.userId,
            speaker_id: party.speakerId,
            affiliation: party.affiliation,
            methods: party.methods
        })),
        interaction: {
            speakers: (gongCall.interaction?.speakers ?? []).map((speaker) => ({
                id: speaker.id,
                user_id: speaker.userId,
                talkTime: speaker.talkTime
            })),
            interaction_stats: (gongCall.interaction?.interactionStats ?? []).map((stat) => ({
                name: stat.name,
                value: stat.value
            })),
            video: (gongCall.interaction?.video ?? []).map((video) => ({
                name: video.name,
                duration: video.duration
            })),
            questions: {
                company_count: gongCall.interaction.questions.companyCount,
                non_company_count: gongCall.interaction.questions.nonCompanyCount
            }
        },
        collaboration: {
            public_comments: (gongCall.collaboration?.publicComments ?? []).map((comment) => ({
                id: comment.id,
                audio_start_time: comment.audioStartTime,
                audio_end_time: comment.audioStartTime,
                commenter_user_id: comment.commenterUserId,
                comment: comment.comment,
                posted: comment.posted,
                during_call: comment.duringCall
            }))
        },
        media_urls: {
            audio_url: gongCall.media.audioUrl,
            video_url: gongCall.media.videoUrl
        }
    };
}
