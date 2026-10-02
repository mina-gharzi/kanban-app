'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reportError } from '@/lib/errors/reportError'
import { normalizeError } from '@/lib/errors/normalizeError'
import { queryKeys } from '@/lib/queries/keys'
import type { InviteRole } from '@/lib/sharing/roles'
import {
  acceptInvite,
  deleteInvite,
  getBoardMembers,
  getReceivedInvites,
  getSentInvites,
  inviteToBoard,
  removeMember,
  setMemberRole,
} from '@/lib/supabase/sharing'

/** اعضا (همه‌ی اعضا می‌بینند) و دعوت‌های ارسال‌شده (فقط مالک؛ `enabled` را برای او روشن کنید) */
export function useBoardSharing(boardId: string, { isOwner, enabled }: { isOwner: boolean; enabled: boolean }) {
  const queryClient = useQueryClient()

  const members = useQuery({
    queryKey: queryKeys.boardMembers(boardId),
    queryFn: () => getBoardMembers(boardId),
    enabled,
  })
  const invites = useQuery({
    queryKey: queryKeys.boardInvites(boardId),
    queryFn: () => getSentInvites(boardId),
    enabled: enabled && isOwner,
  })

  const refreshMembers = () => queryClient.invalidateQueries({ queryKey: queryKeys.boardMembers(boardId) })
  const refreshInvites = () => queryClient.invalidateQueries({ queryKey: queryKeys.boardInvites(boardId) })

  const invite = useMutation({
    mutationFn: ({ email, role }: { email: string; role: InviteRole }) => inviteToBoard(boardId, email, role),
    onSuccess: refreshInvites,
    onError: (error) => reportError(error, 'sharing.invite'),
  })

  const revokeInvite = useMutation({
    mutationFn: (inviteId: string) => deleteInvite(inviteId),
    onSuccess: refreshInvites,
    onError: (error) => {
      reportError(error, 'sharing.revokeInvite')
      void refreshInvites()
    },
  })

  const changeRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: InviteRole }) => setMemberRole(boardId, userId, role),
    onSettled: refreshMembers,
    onError: (error) => reportError(error, 'sharing.changeRole'),
  })

  const remove = useMutation({
    mutationFn: (userId: string) => removeMember(boardId, userId),
    onSettled: refreshMembers,
    onError: (error) => reportError(error, 'sharing.removeMember'),
  })

  return {
    members: members.data ?? [],
    isLoadingMembers: members.isPending && members.fetchStatus !== 'idle',
    membersError: members.error ? normalizeError(members.error) : null,
    sentInvites: invites.data ?? [],
    isLoadingInvites: invites.isPending && invites.fetchStatus !== 'idle',
    invite: invite.mutate,
    isInviting: invite.isPending,
    revokeInvite: revokeInvite.mutate,
    changeRole: changeRole.mutate,
    removeMember: remove.mutate,
    isRemoving: remove.isPending,
  }
}

/** دعوت‌های دریافتیِ من + پذیرش/رد */
export function useReceivedInvites() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: queryKeys.myInvites, queryFn: getReceivedInvites })

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.myInvites })
    void queryClient.invalidateQueries({ queryKey: queryKeys.boards })
  }

  const accept = useMutation({
    mutationFn: (inviteId: string) => acceptInvite(inviteId),
    onSettled: refresh,
    onError: (error) => reportError(error, 'sharing.accept'),
  })
  const decline = useMutation({
    mutationFn: (inviteId: string) => deleteInvite(inviteId),
    onSettled: refresh,
    onError: (error) => reportError(error, 'sharing.decline'),
  })

  return {
    invites: query.data ?? [],
    isPending: query.isPending,
    accept: accept.mutate,
    decline: decline.mutate,
    isBusy: accept.isPending || decline.isPending,
  }
}
