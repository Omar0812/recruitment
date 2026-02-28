import api from './base'

export const emailApi = {
  sendInterviewInvite: (linkId) =>
    api.post('/email/send-interview-invite', { link_id: linkId }, { suppressErrorToast: true }),
}
