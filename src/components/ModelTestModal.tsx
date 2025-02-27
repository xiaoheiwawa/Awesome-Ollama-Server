import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Modal } from './Modal';
import { BeakerIcon, StopIcon } from '@heroicons/react/24/outline';

interface ModelTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  server: string;
  models: string[];
}

export function ModelTestModal({ isOpen, onClose, server, models }: ModelTestModalProps) {
  const t = useTranslations();
  const [selectedModel, setSelectedModel] = useState(models[0] || '');
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const responseEndRef = useRef<HTMLDivElement>(null);
  const [isWating, setIsWating] = useState(false);

  // 自动滚动到底部
  const scrollToBottom = () => {
    if (responseEndRef.current) {
      responseEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleTest = async () => {
    if (!selectedModel || !prompt) return;
    setIsWating(true);
    
    setIsGenerating(true);
    // 保留之前的响应，添加分隔符
    setResponse('');

    try {
      abortControllerRef.current = new AbortController();
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          server,
          model: selectedModel,
          prompt,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('生成失败');
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        setIsWating(false);
        setResponse(prev => prev + text);
        scrollToBottom();
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setResponse(prev => prev + '\n[已停止生成]');
        return;
      }
      console.error('生成出错:', error);
      setResponse(prev => prev + '\n' + t('modelTest.error'));
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
      scrollToBottom();
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('modelTest.title')}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            {t('modelTest.selectModel')}
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md
              text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {models.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            {t('modelTest.prompt')}
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t('modelTest.promptPlaceholder')}
            className="w-full h-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md
              text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2
              focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            {t('modelTest.response')}
          </label>
          <div className="relative">
            <div className={`w-full h-48 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md
              text-gray-200 overflow-y-auto custom-scrollbar font-mono text-sm whitespace-pre-wrap
              ${isGenerating ? 'border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : ''}`}>
              <div className={isGenerating ? 'animate-pulse' : ''}>
                {isWating && !response? t('modelTest.responseEmpty') : response}
                {isGenerating && <span className="inline-block ml-1 animate-pulse">▊</span>}
              </div>
              <div ref={responseEndRef} />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white
              transition-colors duration-200"
          >
            {t('modelTest.close')}
          </button>
          {isGenerating ? (
            <button
              onClick={handleStopGeneration}
              className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium
                bg-gradient-to-r from-rose-500/80 to-pink-500/80 hover:from-rose-500 hover:to-pink-500
                text-white transition-all duration-200 border border-rose-500/20
                shadow-[0_0_10px_rgba(244,63,94,0.2)] hover:shadow-[0_0_15px_rgba(244,63,94,0.3)]"
            >
              <StopIcon className="h-4 w-4 mr-1.5" />
              {t('modelTest.stop')}
            </button>
          ) : (
            <button
              onClick={handleTest}
              disabled={!selectedModel || !prompt}
              className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium
                ${!selectedModel || !prompt
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white'
                }`}
            >
              <BeakerIcon className="h-5 w-5 mr-2" />
              {t('modelTest.test')}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
} 