'use client';

import { useRef, useEffect, useState } from 'react';
import { List, ListOrdered } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface RichTextInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function RichTextInput({ value, onChange, disabled, placeholder, autoFocus }: RichTextInputProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [text, setText] = useState(value || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (value !== text) {
      setText(value);
    }
  }, [value, text]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }, [text]);

  // Auto-focus the textarea when autoFocus is true and not disabled
  useEffect(() => {
    if (autoFocus && !disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus, disabled]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setText(newValue);
    onChange(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursorPosition = textarea.selectionStart;
      const currentText = textarea.value;
      const lines = currentText.substring(0, cursorPosition).split('\n');
      const currentLine = lines[lines.length - 1];

      // Check if we're in a list
      const bulletMatch = currentLine.match(/^(\s*)[•]\s(.*)/);
      const numberMatch = currentLine.match(/^(\s*)(\d+)\.\s(.*)/);

      if (bulletMatch) {
        e.preventDefault();
        const [, spaces, content] = bulletMatch;
        if (content.trim() === '') {
          // Empty bullet point - end the list
          const newText = currentText.substring(0, cursorPosition - (spaces + '• ').length) + 
                         '\n' + 
                         currentText.substring(cursorPosition);
          setText(newText);
          onChange(newText);
          textarea.selectionStart = textarea.selectionEnd = cursorPosition - (spaces + '• ').length + 1;
        } else {
          // Continue the bullet list
          const insertion = '\n' + spaces + '• ';
          const newText = currentText.substring(0, cursorPosition) + 
                         insertion + 
                         currentText.substring(cursorPosition);
          setText(newText);
          onChange(newText);
          textarea.selectionStart = textarea.selectionEnd = cursorPosition + insertion.length;
        }
      } else if (numberMatch) {
        e.preventDefault();
        const [, spaces, num, content] = numberMatch;
        if (content.trim() === '') {
          // Empty number point - end the list
          const newText = currentText.substring(0, cursorPosition - (spaces + num + '. ').length) + 
                         '\n' + 
                         currentText.substring(cursorPosition);
          setText(newText);
          onChange(newText);
          textarea.selectionStart = textarea.selectionEnd = cursorPosition - (spaces + num + '. ').length + 1;
        } else {
          // Continue the numbered list
          const nextNum = parseInt(num) + 1;
          const insertion = '\n' + spaces + nextNum + '. ';
          const newText = currentText.substring(0, cursorPosition) + 
                         insertion + 
                         currentText.substring(cursorPosition);
          setText(newText);
          onChange(newText);
          textarea.selectionStart = textarea.selectionEnd = cursorPosition + insertion.length;
        }
      }
    }
  };

  const handleFocus = () => {
    setShowMenu(true);
  };

  const handleBlur = (e: React.FocusEvent) => {
    if (e.relatedTarget && (e.relatedTarget as HTMLElement).closest('.floating-menu')) {
      return;
    }
    setShowMenu(false);
  };

  const insertList = (type: 'bullet' | 'number') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    const currentText = textarea.value;
    const prefix = type === 'bullet' ? '• ' : '1. ';
    
    // If we're not at the start of a line, add a newline first
    const needsNewline = cursorPosition > 0 && currentText[cursorPosition - 1] !== '\n';
    const insertion = (needsNewline ? '\n' : '') + prefix;
    
    const newText = currentText.substring(0, cursorPosition) + 
                   insertion + 
                   currentText.substring(cursorPosition);
    
    setText(newText);
    onChange(newText);
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = cursorPosition + insertion.length;
  };

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder}
        className={`min-h-[100px] p-3 text-white resize-none overflow-hidden ${
          disabled 
            ? 'bg-gray-900/50 border-gray-800 text-gray-500' 
            : 'bg-gray-900/30 border-gray-800 focus:border-blue-500 hover:border-gray-700'
        }`}
        style={{
          direction: 'ltr',
          textAlign: 'left'
        }}
      />

      {showMenu && !disabled && (
        <div className="floating-menu flex items-center gap-1 px-2 py-1.5 bg-gray-800 rounded-lg shadow-lg border border-gray-700 w-fit">
          <button
            onClick={() => insertList('bullet')}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            type="button"
            title="Bullet List"
          >
            <List className="h-4 w-4 text-white" />
          </button>
          <button
            onClick={() => insertList('number')}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            type="button"
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4 text-white" />
          </button>
        </div>
      )}
    </div>
  );
} 