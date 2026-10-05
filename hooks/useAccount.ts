'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteMyAccount,
  exportMyData,
  getDeletionPreview,
  type SharedBoardsPolicy,
} from '@/lib/supabase/account'

/** پیش‌نمایش پیامدهای حذف؛ هر بار تازه خوانده می‌شود (بوردها ممکن است عوض شده باشند) */
export function useDeletionPreview(enabled: boolean) {
  return useQuery({
    queryKey: ['account-deletion-preview'],
    queryFn: getDeletionPreview,
    enabled,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ password, sharedBoards }: { password: string; sharedBoards: SharedBoardsPolicy }) =>
      deleteMyAccount(password, sharedBoards),
    onSuccess: () => queryClient.clear(),
  })
}

export function useExportMyData() {
  return useMutation({ mutationFn: exportMyData })
}
