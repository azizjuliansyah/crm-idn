import type { KbArticle } from './kb';

export interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  references?: KbArticle[];
}
