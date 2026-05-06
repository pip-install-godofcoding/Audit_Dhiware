import React from 'react';
import Checkbox from '@/components/ui/Checkbox';

interface DocumentRowProps {
  id: string
  filename: string
  fileType: 'pdf' | 'docx' | 'txt'
  size: string
  uploadedAt: string
  maskingStatus: 'masked' | 'processing' | 'failed' | 'pending'
  selected: boolean
  onToggle: (id: string) => void
  disabled?: boolean
}

export default function DocumentRow({
  id, filename, fileType, size, uploadedAt, maskingStatus, selected, onToggle, disabled
}: DocumentRowProps) {
  const getIconColor = () => {
    switch (fileType) {
      case 'pdf': return 'bg-red-100 text-red-600';
      case 'docx': return 'bg-blue-100 text-blue-600';
      case 'txt': return 'bg-gray-100 text-gray-500';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  const getBadgeStyle = () => {
    switch (maskingStatus) {
      case 'masked': return 'bg-green-100 text-green-700';
      case 'processing': return 'bg-yellow-100 text-yellow-700';
      case 'failed': return 'bg-red-100 text-red-600';
      case 'pending': return 'bg-gray-100 text-gray-500';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  const getBadgeText = () => {
    switch (maskingStatus) {
      case 'masked': return 'Masked ✓';
      case 'processing': return 'Processing...';
      case 'failed': return 'Failed';
      case 'pending': return 'Pending';
      default: return 'Pending';
    }
  };

  return (
    <div 
      className={`flex w-full items-center border-b border-gray-100 py-3 px-2 transition-colors ${
        disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'
      } ${selected ? 'bg-indigo-50 hover:bg-indigo-50' : ''}`}
      onClick={() => !disabled && onToggle(id)}
    >
      <div className="mr-3" onClick={e => e.stopPropagation()}>
        <Checkbox 
          id={id} 
          checked={selected} 
          onChange={() => !disabled && onToggle(id)} 
          disabled={disabled} 
        />
      </div>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold uppercase mr-3 ${getIconColor()}`}>
        {fileType}
      </div>
      <div className="text-sm font-medium text-gray-900 flex-1 truncate pr-4">
        {filename}
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span>{size}</span>
        <span>{uploadedAt}</span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getBadgeStyle()}`}>
          {getBadgeText()}
        </span>
      </div>
    </div>
  );
}
