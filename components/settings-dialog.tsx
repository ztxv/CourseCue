'use client';

import { useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { Check, Eye, EyeOff, GitFork, Settings, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { defaultModel, detectProvider, PROVIDER_MODELS, type AiProvider, type AiSettings } from '@/lib/ai-provider';

const PROVIDER_DETAILS: Record<AiProvider, { name: string; note: string }> = {
  openai: { name: 'OpenAI', note: 'Best match for CourseCue’s current PDF and DOCX pipeline.' },
  anthropic: { name: 'Anthropic', note: 'Claude supports text and PDF syllabi in CourseCue.' },
  nvidia: { name: 'NVIDIA', note: 'NIM models currently work with pasted text, TXT, and Markdown.' },
  unknown: { name: 'Provider not detected', note: 'Paste an OpenAI, Anthropic, or NVIDIA API key.' },
};

export function SettingsDialog({ settings, onSave }: { settings: AiSettings; onSave: (settings: AiSettings) => void }) {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [model, setModel] = useState(settings.model);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const provider = detectProvider(apiKey);
  const details = PROVIDER_DETAILS[provider];

  function changeOpen(nextOpen: boolean) {
    if (nextOpen) {
      setApiKey(settings.apiKey);
      setModel(settings.model);
      setShowKey(false);
      setSaved(false);
    }
    setOpen(nextOpen);
  }

  function updateKey(value: string) {
    const previousProvider = detectProvider(apiKey);
    const nextProvider = detectProvider(value);
    setApiKey(value);
    setSaved(false);
    if (nextProvider !== 'unknown' && nextProvider !== previousProvider) setModel(defaultModel(nextProvider));
    if (!value) setModel('');
  }

  function save() {
    const trimmedKey = apiKey.trim();
    const detected = detectProvider(trimmedKey);
    if (trimmedKey && detected === 'unknown') return;
    onSave({ apiKey: trimmedKey, provider: detected, model: trimmedKey ? model || defaultModel(detected) : '' });
    setSaved(true);
    window.setTimeout(() => setOpen(false), 260);
  }

  function clear() {
    setApiKey('');
    setModel('');
    onSave({ apiKey: '', provider: 'unknown', model: '' });
    setSaved(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Trigger className="settings-trigger" aria-label="Open settings" title="Settings" render={<Button variant="outline" size="icon-lg" />}>
        <Settings aria-hidden="true" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="settings-backdrop" />
        <Dialog.Popup className="settings-dialog">
          <div className="settings-heading">
            <div><p className="overline">COURSECUE SETTINGS</p><Dialog.Title>Bring your own AI.</Dialog.Title><Dialog.Description>Your key stays saved in this browser and is sent only when you analyze a syllabus.</Dialog.Description></div>
            <Dialog.Close className="settings-close" aria-label="Close settings"><X aria-hidden="true" /></Dialog.Close>
          </div>

          <section className="settings-section">
            <label className="settings-label" htmlFor="api-key">API key</label>
            <div className={`key-field ${provider}`}>
              <input id="api-key" type={showKey ? 'text' : 'password'} value={apiKey} onChange={(event) => updateKey(event.target.value)} placeholder="sk-…, sk-ant-…, or nvapi-…" autoComplete="off" spellCheck={false} />
              <button type="button" onClick={() => setShowKey((visible) => !visible)} aria-label={showKey ? 'Hide API key' : 'Show API key'}>{showKey ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button>
            </div>
            <div className={`provider-detection ${provider}`}><strong>{details.name}</strong><small>{details.note}</small></div>

            {provider !== 'unknown' && <label className="model-field"><span>Model</span><select value={model || defaultModel(provider)} onChange={(event) => setModel(event.target.value)}>{PROVIDER_MODELS[provider].map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>}
            {apiKey && provider === 'unknown' && <p className="settings-error" role="alert">That key prefix is not recognized. Use an OpenAI, Anthropic, or NVIDIA key.</p>}
            <p className="settings-privacy">The key is stored with your other local CourseCue data. If you use a hosted copy, its server relays each analysis to the detected provider; self-hosting is the safest option.</p>
          </section>

          <div className="settings-actions">
            <button className="clear-key" type="button" onClick={clear} disabled={!apiKey}><Trash2 aria-hidden="true" /> Clear key</button>
            <button className={`save-settings ${saved ? 'saved' : ''}`} type="button" onClick={save} disabled={Boolean(apiKey) && provider === 'unknown'}>{saved ? <><Check aria-hidden="true" /> Saved</> : 'Save settings'}</button>
          </div>

          <footer className="settings-footer">
            <a className="github-project" href="https://github.com/ztxv/CourseCue" target="_blank" rel="noreferrer"><GitFork aria-hidden="true" /><span>View project on GitHub</span></a>
            <span>CourseCue v0.9.7</span>
          </footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
