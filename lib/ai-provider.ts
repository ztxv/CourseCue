export type AiProvider = 'openai' | 'anthropic' | 'nvidia' | 'unknown';

export type AiSettings = {
  apiKey: string;
  provider: AiProvider;
  model: string;
};

export const AI_SETTINGS_KEY = 'coursecue-ai-settings-v1';

export const PROVIDER_MODELS: Record<Exclude<AiProvider, 'unknown'>, Array<{ value: string; label: string }>> = {
  openai: [
    { value: 'gpt-5.4-mini', label: 'GPT-5.4 mini' },
    { value: 'gpt-5.4-nano', label: 'GPT-5.4 nano' },
  ],
  anthropic: [
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
    { value: 'claude-sonnet-5-20260203', label: 'Claude Sonnet 5' },
  ],
  nvidia: [
    { value: 'moonshotai/kimi-k2.5', label: 'Kimi K2.5' },
    { value: 'moonshotai/kimi-k2.6', label: 'Kimi K2.6' },
    { value: 'deepseek-ai/deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
  ],
};

export function detectProvider(apiKey: string): AiProvider {
  const key = apiKey.trim();
  if (key.startsWith('sk-ant-')) return 'anthropic';
  if (key.startsWith('nvapi-')) return 'nvidia';
  if (key.startsWith('sk-')) return 'openai';
  return 'unknown';
}

export function defaultModel(provider: AiProvider) {
  return provider === 'unknown' ? '' : PROVIDER_MODELS[provider][0].value;
}

export const EMPTY_AI_SETTINGS: AiSettings = { apiKey: '', provider: 'unknown', model: '' };
