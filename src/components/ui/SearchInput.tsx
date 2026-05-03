import React from 'react';
import { Search } from 'lucide-react';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const SearchInput: React.FC<SearchInputProps> = ({ 
  className = '', 
  ...props 
}) => {
  return (
    <div className="relative w-full group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors">
        <Search size={14} />
      </div>
      <input
        type="text"
        className={`w-full pl-11 pr-4 py-3 bg-white border-2 border-gray-300 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-medium text-gray-900 ${className}`}
        {...props}
      />
    </div>
  );
};
