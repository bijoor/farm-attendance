import React, { type InputHTMLAttributes } from 'react';
import { useApp } from '../../context/AppContext';

interface TransliterateInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
}

const TransliterateInput: React.FC<TransliterateInputProps> = ({
  label,
  error,
  value,
  onChange,
  className = '',
  ...props
}) => {
  const { settings } = useApp();
  const isMarathi = settings.language === 'mr';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {label}
        </label>
      )}
      <input
        value={value}
        onChange={handleChange}
        lang={isMarathi ? 'mr' : 'en'}
        className={`
          w-full px-3 py-2 border rounded-lg text-slate-800
          focus:outline-none focus:ring-2 focus:ring-graminno-500 focus:border-graminno-500
          disabled:bg-slate-100 disabled:cursor-not-allowed
          ${error ? 'border-red-500' : 'border-slate-300'}
          ${className}
        `}
        {...props}
      />
      {isMarathi && (
        <p className="mt-1 text-xs text-graminno-600">
          मराठी टाइप करण्यासाठी फोनवर मराठी कीबोर्ड वापरा (Gboard → मराठी)
        </p>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default TransliterateInput;
