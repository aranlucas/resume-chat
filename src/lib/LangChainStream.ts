import { createCallbacksTransformer, type AIStreamCallbacks } from "ai";

export function LangChainStream(callbacks?: AIStreamCallbacks) {
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const runMap = new Set();

  const handleError = async (e: any, runId: string) => {
    runMap.delete(runId);
    await writer.ready;
    await writer.abort(e);
  };

  const endStream = async () => {
    if (runMap.size === 0) {
      await writer.ready;
      await writer.close();
    }
  };

  return {
    stream: stream.readable.pipeThrough(createCallbacksTransformer(callbacks)),
    handlers: {
      handleLLMStart: async (_llm: any, _prompts: string[], runId: string) => {
        runMap.add(runId);
      },
      handleLLMNewToken: async (token: string) => {
        await writer.ready;
        await writer.write(token);
      },
      handleLLMError: async (e: Error, runId: string) => {
        await handleError(e, runId);
      },
      handleLLMEnd: async (_output: any, runId: string) => {
        runMap.delete(runId);
        await endStream();
      },
      handleChatModelStart: async (
        _llm: any,
        _messages: any,
        runId: string
      ) => {
        runMap.add(runId);
      },
      handleChatModelEnd: async (_output: any, runId: string) => {
        runMap.delete(runId);

        await endStream();
      },
      handleChainStart: async (_chain: any, _inputs: any, runId: string) => {
        runMap.add(runId);
      },
      handleChainError: async (e: Error, runId: string) => {
        await handleError(e, runId);
      },
      handleChainEnd: async (_outputs: any, runId: string) => {
        runMap.delete(runId);

        await endStream();
      },
      handleToolStart: async (_tool: any, _input: string, runId: string) => {
        runMap.add(runId);
      },
      handleToolError: async (e: Error, runId: string) => {
        await handleError(e, runId);
      },
      handleToolEnd: async (_output: string, runId: string) => {
        runMap.delete(runId);

        await endStream();
      },
      handleAgentAction: async (_action: any, runId: string) => {
        runMap.add(runId);
      },
      handleAgentEnd: async (_output: any, runId: string) => {
        runMap.delete(runId);

        await endStream();
      },
    },
  };
}
