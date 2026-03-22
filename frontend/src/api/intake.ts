import type {
  CandidateDetail,
  IntakeResolveRequest,
  IntakeResolveResponse,
} from './types'

import {
  checkDuplicate,
  createCandidate,
  fetchCandidate,
  fetchCandidateApplications,
  updateCandidate,
} from './candidates'

export { checkDuplicate } from './candidates'

export async function resolveIntake(req: IntakeResolveRequest): Promise<IntakeResolveResponse> {
  let candidate: CandidateDetail

  if (req.decision === 'merge_existing') {
    if (!req.existing_candidate_id) {
      throw new Error('缺少已有候选人ID')
    }
    // 先获取已有档案的 version（乐观锁）
    const existing = await fetchCandidate(req.existing_candidate_id)
    candidate = await updateCandidate(req.existing_candidate_id, {
      ...req.incoming,
      version: existing.version,
    })
    return {
      action: 'merged',
      candidate,
      active_link: null,
    }
  }

  candidate = await createCandidate(req.incoming)
  return {
    action: 'created',
    candidate,
    active_link: null,
  }
}
