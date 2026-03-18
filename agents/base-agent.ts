import { AgentType, AgentRunStatus } from '@prisma/client'
import { prisma } from '@/lib/db'
import { anthropic } from '@/lib/ai/client'

// ─── Base Agent Interface ───

export interface AgentInput {
  workspaceId: string
  campaignId?: string
  triggeredBy?: string
  payload: Record<string, unknown>
}

export interface AgentOutput {
  success: boolean
  data: Record<string, unknown>
  errors?: string[]
}

export interface AgentContext {
  runId: string
  workspaceId: string
  campaignId?: string
  knowledgeBase: Record<string, string>
}

// ─── Base Agent Class ───

export abstract class BaseAgent {
  abstract readonly type: AgentType
  abstract readonly name: string
  abstract readonly description: string
  abstract readonly model: string

  /**
   * Execute the agent's main logic.
   * Subclasses implement this with their specific behavior.
   */
  protected abstract execute(
    input: AgentInput,
    context: AgentContext
  ): Promise<AgentOutput>

  /**
   * Build the system prompt for this agent.
   * Subclasses override to provide agent-specific prompts.
   */
  protected abstract buildSystemPrompt(
    context: AgentContext
  ): string

  /**
   * Run the agent with full logging and error handling.
   * This is the public entry point — never override this.
   */
  async run(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now()

    // Create agent run record
    const agentRun = await prisma.agentRun.create({
      data: {
        workspaceId: input.workspaceId,
        campaignId: input.campaignId,
        triggeredBy: input.triggeredBy,
        agentType: this.type,
        status: AgentRunStatus.RUNNING,
        input: input.payload as any,
      },
    })

    try {
      // Load knowledge base for context
      const kbEntries = await prisma.knowledgeBaseEntry.findMany({
        where: { workspaceId: input.workspaceId, isActive: true },
      })

      const knowledgeBase: Record<string, string> = {}
      for (const entry of kbEntries) {
        knowledgeBase[`${entry.category}::${entry.key}`] = entry.value
      }

      const context: AgentContext = {
        runId: agentRun.id,
        workspaceId: input.workspaceId,
        campaignId: input.campaignId,
        knowledgeBase,
      }

      // Execute agent logic
      const output = await this.execute(input, context)
      const durationMs = Date.now() - startTime

      // Log success
      await prisma.agentRun.update({
        where: { id: agentRun.id },
        data: {
          status: AgentRunStatus.COMPLETED,
          output: output.data as any,
          durationMs,
          completedAt: new Date(),
        },
      })

      return output
    } catch (error) {
      const durationMs = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      // Log failure
      await prisma.agentRun.update({
        where: { id: agentRun.id },
        data: {
          status: AgentRunStatus.FAILED,
          error: errorMessage,
          durationMs,
          completedAt: new Date(),
        },
      })

      return {
        success: false,
        data: {},
        errors: [errorMessage],
      }
    }
  }

  /**
   * Call Claude API with the agent's system prompt.
   */
  protected async callClaude(
    systemPrompt: string,
    userMessage: string,
    maxTokens: number = 4096
  ): Promise<string> {
    const response = await anthropic.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Claude')
    }

    return textBlock.text
  }
}
