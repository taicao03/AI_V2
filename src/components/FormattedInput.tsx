import React, { useRef, useEffect, useState } from 'react';
import { formatNumber, parseNumberInput } from '../lib/formatHelpers';

interface FormattedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number;
  onChange: (value: number) => void;
}

export function FormattedInput({ value, onChange, className, ...props }: FormattedInputProps) {
  const [inputValue, setInputValue] = useState(formatNumber(value));
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with parent value if it changes externally
  useEffect(() => {
    const parsedCurrentDisplay = parseNumberInput(inputValue);
    if (parsedCurrentDisplay !== value) {
      setInputValue(value === 0 ? '' : formatNumber(value));
    }
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawString = e.target.value;

    if (rawString === '') {
      setInputValue('');
      onChange(0);
      return;
    }

    const numericValue = parseNumberInput(rawString);

    // Keep track of cursor position
    const selectionStart = e.target.selectionStart || 0;
    const digitsBeforeCursor = rawString.slice(0, selectionStart).replace(/[^\d]/g, '').length;

    // Update display value
    const formatted = formatNumber(numericValue);
    setInputValue(formatted);

    // Propagate parsed number to parent
    onChange(numericValue);

    // Restore cursor position in next tick after React updates DOM
    requestAnimationFrame(() => {
      if (inputRef.current) {
        let newCursorPos = 0;
        let digitsSeen = 0;
        for (let i = 0; i < formatted.length; i++) {
          if (formatted[i] >= '0' && formatted[i] <= '9') {
            digitsSeen++;
          }
          newCursorPos = i + 1;
          if (digitsSeen === digitsBeforeCursor) {
            break;
          }
        }
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    });
  };

  return (
    <input
      ref={inputRef}
      type="text"
      className={className}
      value={inputValue}
      onChange={handleTextChange}
      {...props}
    />
  );
}
