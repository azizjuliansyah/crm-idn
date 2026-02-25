import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-2 w-full">
      {label && (
        <label className="text-[10px] font-medium text-gray-400 uppercase tracking-tight ml-1">
          {label}
        </label>
      )}
      <textarea
        className={`w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl outline-none resize-none focus:bg-white focus:border-blue-500 transition-all font-medium text-xs text-gray-700 shadow-inner ${error ? 'border-rose-300 focus:border-rose-500' : ''
          } ${className}`}
        {...props}
      />
      {error && <p className="text-[9px] text-rose-500  uppercase ml-1">{error}</p>}
    </div>
  );
};
