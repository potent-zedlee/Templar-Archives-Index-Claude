'use client'

/**
 * 포스트 댓글 섹션 (Placeholder)
 * TODO: 실제 댓글 기능 구현 필요
 */
export function PostCommentsSection({ postId }: { postId: string }) {
  return (
    <div className="bg-card rounded-lg border p-6">
      <h2 className="text-xl font-semibold mb-4">댓글</h2>
      <div className="text-center py-8 text-muted-foreground">
        <p>댓글 기능은 개발 중입니다.</p>
        <p className="text-sm mt-2">포스트 ID: {postId}</p>
      </div>
    </div>
  )
}
