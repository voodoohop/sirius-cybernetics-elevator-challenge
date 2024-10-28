import { useRef, useEffect } from 'react';
import { Message, UiState } from '@/types';
import { useState } from 'react';

// Scroll management hook
export const useMessageScroll = (messages: Message[]) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  return ref;
};

// Input focus management hook
export const useInput = (isLoading: boolean) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!isLoading && ref.current) {
      ref.current.focus();
    }
  }, [isLoading]);
  return { inputRef: ref };
};

// UI state management hook
export const useUiState = (initial: UiState) => useState<UiState>(initial);
