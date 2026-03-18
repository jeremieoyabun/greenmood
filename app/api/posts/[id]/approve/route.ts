import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { approvalActionSchema } from '@/lib/schemas/validation'
import { PostStatus } from '@prisma/client'

// Valid approval state transitions
const VALID_TRANSITIONS: Record<string, Record<string, PostStatus>> = {
  DRAFT: { APPROVE: PostStatus.AI_GENERATED },
  AI_GENERATED: { APPROVE: PostStatus.FACT_CHECKED, REJECT: PostStatus.REJECTED },
  FACT_CHECKED: { APPROVE: PostStatus.BRAND_APPROVED, REJECT: PostStatus.REJECTED, REQUEST_CHANGES: PostStatus.REJECTED },
  BRAND_APPROVED: { APPROVE: PostStatus.READY_TO_SCHEDULE, REJECT: PostStatus.REJECTED },
  READY_TO_SCHEDULE: { APPROVE: PostStatus.SCHEDULED },
  SCHEDULED: { APPROVE: PostStatus.PUBLISHED },
  REJECTED: { APPROVE: PostStatus.DRAFT },
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const parsed = approvalActionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.message },
        { status: 400 }
      )
    }

    const { action, comment, reviewerId } = parsed.data

    // Get current post
    const post = await prisma.post.findUnique({ where: { id } })
    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      )
    }

    // Validate transition
    const transitions = VALID_TRANSITIONS[post.status]
    if (!transitions || !transitions[action]) {
      return NextResponse.json(
        { success: false, error: `Invalid transition: ${post.status} → ${action}` },
        { status: 400 }
      )
    }

    // Require comment for rejections
    if (action === 'REJECT' && !comment) {
      return NextResponse.json(
        { success: false, error: 'Comment is required when rejecting' },
        { status: 400 }
      )
    }

    const toStatus = transitions[action]

    // Execute transition in a transaction
    const [updatedPost, approvalStep] = await prisma.$transaction([
      prisma.post.update({
        where: { id },
        data: { status: toStatus },
      }),
      prisma.approvalStep.create({
        data: {
          postId: id,
          reviewerId,
          fromStatus: post.status,
          toStatus,
          action: action as any,
          comment,
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: { post: updatedPost, approvalStep },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Database error' },
      { status: 500 }
    )
  }
}
