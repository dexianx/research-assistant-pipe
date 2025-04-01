export interface Model {
  id: string
  name: string
  provider: string
  contextLength: number
}

export const NEBIUS_MODELS: Model[] = [
  {
    id: "meta-llama/Meta-Llama-3.1-8B-Instruct",
    name: "Meta Llama 3.1 8B Instruct",
    provider: "Meta",
    contextLength: 128000,
  },
  {
    id: "meta-llama/Meta-Llama-3.1-70B-Instruct",
    name: "Meta Llama 3.1 70B Instruct",
    provider: "Meta",
    contextLength: 128000,
  },
  {
    id: "meta-llama/Meta-Llama-3.1-405B-Instruct",
    name: "Meta Llama 3.1 405B Instruct",
    provider: "Meta",
    contextLength: 128000,
  },
  {
    id: "meta-llama/Llama-3.2-1B-Instruct",
    name: "Llama 3.2 1B Instruct",
    provider: "Meta",
    contextLength: 128000,
  },
  {
    id: "meta-llama/Llama-3.2-3B-Instruct",
    name: "Llama 3.2 3B Instruct",
    provider: "Meta",
    contextLength: 128000,
  },
  {
    id: "meta-llama/Llama-3.3-70B-Instruct",
    name: "Llama 3.3 70B Instruct",
    provider: "Meta",
    contextLength: 128000,
  },
  {
    id: "nvidia/Llama-3.1-Nemotron-70B-Instruct-HF",
    name: "NVIDIA Llama 3.1 Nemotron 70B",
    provider: "NVIDIA",
    contextLength: 128000,
  },
  {
    id: "mistralai/Mistral-Nemo-Instruct-2407",
    name: "Mistral Nemo Instruct 2407",
    provider: "Mistral AI",
    contextLength: 128000,
  },
  {
    id: "mistralai/Mixtral-8x7B-Instruct-v0.1",
    name: "Mixtral 8x7B Instruct v0.1",
    provider: "Mistral AI",
    contextLength: 33000,
  },
  {
    id: "mistralai/Mixtral-8x22B-Instruct-v0.1",
    name: "Mixtral 8x22B Instruct v0.1",
    provider: "Mistral AI",
    contextLength: 65000,
  },
  {
    id: "google/gemma-2-2b-it",
    name: "Gemma 2 2B Instruct",
    provider: "Google",
    contextLength: 4000,
  },
  {
    id: "google/gemma-2-9b-it",
    name: "Gemma 2 9B Instruct",
    provider: "Google",
    contextLength: 8000,
  },
  {
    id: "google/gemma-2-27b-it",
    name: "Gemma 2 27B Instruct",
    provider: "Google",
    contextLength: 8000,
  },
  {
    id: "Qwen/Qwen2.5-72B-Instruct",
    name: "Qwen 2.5 72B Instruct",
    provider: "Qwen",
    contextLength: 128000,
  },
  {
    id: "Qwen/Qwen2.5-32B-Instruct",
    name: "Qwen 2.5 32B Instruct",
    provider: "Qwen",
    contextLength: 128000,
  },
  {
    id: "deepseek-ai/DeepSeek-V3",
    name: "DeepSeek V3",
    provider: "DeepSeek",
    contextLength: 128000,
  },
  {
    id: "microsoft/Phi-3.5-mini-instruct",
    name: "Phi 3.5 Mini Instruct",
    provider: "Microsoft",
    contextLength: 128000,
  },
  {
    id: "microsoft/Phi-3.5-MoE-instruct",
    name: "Phi 3.5 MoE Instruct",
    provider: "Microsoft",
    contextLength: 128000,
  },
]

