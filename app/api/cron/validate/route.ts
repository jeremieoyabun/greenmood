import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { FactCheckerAgent, BrandGuardianAgent } from '@/agents'
import { PostStatus, ApprovalAction } from '@prisma/client'

const WORKSPACE_ID = 'cmmvt7qrr0000tcg4mgcwdxxg'

/**
 * Auto Fact-Check + Brand Guardian — runs at 07:05 UTC
 *
 * Finds all posts with status AI_GENERATED, runs fact-checking (haiku)
 * and brand voice validation. If both pass, advances to FACT_CHECKED.
 * If either fails, adds a comment and keeps as AI_GENERATED.
 * Each check is logged as an approval_step.
 */
export async function GET(req: NextRequest) {
  // ─── Auth check ───
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const startTime = Date.now()

  try {
    // Find all AI_GENERATED posts
    const postsToValidate = await prisma.post.findMany({
      where: {
        workspaceId: WORKSPACE_ID,
        status: PostStatus.AI_GENERATED,
      },
      include: {
        variants: {
          where: { isActive: true },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    })

    if (postsToValidate.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No AI_GENERATED posts to validate',
        checked: 0,
        passed: 0,
        failed: 0,
        durationMs: Date.now() - startTime,
      })
    }

    const factChecker = new FactCheckerAgent()
    const brandGuardian = new BrandGuardianAgent()

    const results: Array<{
      postId: string
      market: string
      platform: string
      factCheck: string
      brandCheck: string
      outcome: 'passed' | 'failed'
      issues: string[]
    }> = []

    for (const post of postsToValidate) {
      const variant = post.variants[0]
      if (!variant) {
        results.push({
          postId: post.id,
          market: post.market,
          platform: post.platform,
          factCheck: 'skipped',
          brandCheck: 'skipped',
          outcome: 'failed',
          issues: ['No active variant found'],
        })
        continue
      }

      const content = variant.text
      const allIssues: string[] = []
      let factCheckStatus = 'pass'
      let brandCheckStatus = 'pass'

      // ─── Fact Check ───
      try {
        const factResult = await factChecker.run({
          workspaceId: WORKSPACE_ID,
          payload: {
            content,
            contentType: `${post.platform} post for ${post.market} market`,
          },
        })

        if (factResult.success && factResult.data) {
          let data = factResult.data as any
          // Handle rawResponse wrapping
          if (data.rawResponse && !data.status) {
            const raw = data.rawResponse
            const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/)
            try { data = JSON.parse(jsonMatch ? jsonMatch[1] : raw) } catch { /* keep original */ }
          }
          factCheckStatus = data.status || 'pass'

          if (data.status === 'fail' || data.status === 'warning') {
            const issues = data.issues || []
            for (const issue of issues) {
              if (issue.severity === 'critical') {
                allIssues.push(`[FACT] ${issue.type}: ${issue.detail || issue.explanation}`)
              } else {
                allIssues.push(`[FACT-WARN] ${issue.type}: ${issue.detail || issue.explanation}`)
              }
            }
          }
        }
      } catch (err) {
        factCheckStatus = 'error'
        allIssues.push(`[FACT-ERROR] ${err instanceof Error ? err.message : 'Unknown error'}`)
      }

      // Log fact-check approval step
      await prisma.approvalStep.create({
        data: {
          postId: post.id,
          fromStatus: PostStatus.AI_GENERATED,
          toStatus: factCheckStatus === 'fail'
            ? PostStatus.AI_GENERATED
            : PostStatus.AI_GENERATED, // Don't advance yet, wait for brand check
          action: factCheckStatus === 'pass'
            ? ApprovalAction.AUTO_PASS
            : factCheckStatus === 'warning'
            ? ApprovalAction.AUTO_PASS
            : ApprovalAction.REQUEST_CHANGES,
          comment: factCheckStatus === 'pass'
            ? 'Fact check passed (auto)'
            : factCheckStatus === 'warning'
            ? `Fact check passed with warnings: ${allIssues.filter(i => i.startsWith('[FACT')).join('; ')}`
            : `Fact check failed: ${allIssues.filter(i => i.startsWith('[FACT')).join('; ')}`,
        },
      })

      // ─── Brand Voice Check ───
      try {
        const brandResult = await brandGuardian.run({
          workspaceId: WORKSPACE_ID,
          payload: {
            content,
            market: post.market,
            platform: post.platform,
          },
        })

        if (brandResult.success && brandResult.data) {
          let data = brandResult.data as any
          // Handle rawResponse wrapping
          if (data.rawResponse && !data.status) {
            const raw = data.rawResponse
            const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/)
            try { data = JSON.parse(jsonMatch ? jsonMatch[1] : raw) } catch { /* keep original */ }
          }
          brandCheckStatus = data.status || 'pass'

          if (data.status === 'needs_revision' || data.status === 'fail') {
            const issues = data.issues || []
            for (const issue of issues) {
              if (issue.severity === 'critical') {
                allIssues.push(`[BRAND] ${issue.type}: ${issue.detail || issue.explanation}`)
              } else {
                allIssues.push(`[BRAND-SUGGEST] ${issue.type}: ${issue.detail || issue.explanation}`)
              }
            }
          }

          // Check for em-dashes specifically (brand rule)
          if (content.includes('—') && content.match(/^[\s]*—/m)) {
            allIssues.push('[BRAND] formatting: Em dash used as list marker — replace with bullet or dash')
            brandCheckStatus = 'needs_revision'
          }
        }
      } catch (err) {
        brandCheckStatus = 'error'
        allIssues.push(`[BRAND-ERROR] ${err instanceof Error ? err.message : 'Unknown error'}`)
      }

      // Log brand check approval step
      await prisma.approvalStep.create({
        data: {
          postId: post.id,
          fromStatus: PostStatus.AI_GENERATED,
          toStatus: brandCheckStatus === 'pass'
            ? PostStatus.AI_GENERATED // Will be advanced below if both pass
            : PostStatus.AI_GENERATED,
          action: brandCheckStatus === 'pass'
            ? ApprovalAction.AUTO_PASS
            : ApprovalAction.REQUEST_CHANGES,
          comment: brandCheckStatus === 'pass'
            ? 'Brand voice check passed (auto)'
            : `Brand voice issues: ${allIssues.filter(i => i.startsWith('[BRAND')).join('; ')}`,
        },
      })

      // ─── Determine outcome ───
      const hasCriticalIssues = allIssues.some(
        (i) => i.startsWith('[FACT]') || i.startsWith('[BRAND]') || i.includes('ERROR')
      )

      if (!hasCriticalIssues) {
        // Both checks passed — advance to FACT_CHECKED
        await prisma.post.update({
          where: { id: post.id },
          data: { status: PostStatus.FACT_CHECKED },
        })

        await prisma.approvalStep.create({
          data: {
            postId: post.id,
            fromStatus: PostStatus.AI_GENERATED,
            toStatus: PostStatus.FACT_CHECKED,
            action: ApprovalAction.AUTO_PASS,
            comment: 'Auto-validated: fact check and brand voice both passed',
          },
        })

        results.push({
          postId: post.id,
          market: post.market,
          platform: post.platform,
          factCheck: factCheckStatus,
          brandCheck: brandCheckStatus,
          outcome: 'passed',
          issues: allIssues,
        })
      } else {
        // Keep as AI_GENERATED with issues logged
        results.push({
          postId: post.id,
          market: post.market,
          platform: post.platform,
          factCheck: factCheckStatus,
          brandCheck: brandCheckStatus,
          outcome: 'failed',
          issues: allIssues,
        })
      }
    }

    const passed = results.filter((r) => r.outcome === 'passed').length
    const failed = results.filter((r) => r.outcome === 'failed').length

    return NextResponse.json({
      success: true,
      checked: postsToValidate.length,
      passed,
      failed,
      results,
      durationMs: Date.now() - startTime,
    })
  } catch (error) {
    console.error('Cron validate error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Validation cron failed',
        durationMs: Date.now() - startTime,
      },
      { status: 500 }
    )
  }
}
