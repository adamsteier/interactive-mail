'use client';

import { useState } from 'react';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EditableInfo) => void;
  info: EditableInfo;
}

interface EditableInfo {
  targetArea: string;
  businessName: string;
  industry: string;
  description: string;
}

const EditModal = ({ isOpen, onClose, onSave, info }: EditModalProps) => {
  const [editedInfo, setEditedInfo] = useState<EditableInfo>(info);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg border-2 border-electric-teal bg-charcoal p-6 shadow-glow">
        <h2 className="mb-6 text-2xl font-semibold text-electric-teal">Edit Information</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-electric-teal/80">Target Area</label>
            <input
              type="text"
              value={editedInfo.targetArea}
              onChange={(e) => setEditedInfo(prev => ({ ...prev, targetArea: e.target.value }))}
              className="mt-1 w-full rounded border border-electric-teal/50 bg-charcoal px-3 py-2 text-electric-teal"
            />
          </div>
          
          <div>
            <label className="block text-sm text-electric-teal/80">Business Name</label>
            <input
              type="text"
              value={editedInfo.businessName}
              onChange={(e) => setEditedInfo(prev => ({ ...prev, businessName: e.target.value }))}
              className="mt-1 w-full rounded border border-electric-teal/50 bg-charcoal px-3 py-2 text-electric-teal"
            />
          </div>
          
          <div>
            <label className="block text-sm text-electric-teal/80">Industry</label>
            <input
              type="text"
              value={editedInfo.industry}
              onChange={(e) => setEditedInfo(prev => ({ ...prev, industry: e.target.value }))}
              className="mt-1 w-full rounded border border-electric-teal/50 bg-charcoal px-3 py-2 text-electric-teal"
            />
          </div>
          
          <div>
            <label className="block text-sm text-electric-teal/80">Business Description</label>
            <textarea
              value={editedInfo.description}
              onChange={(e) => setEditedInfo(prev => ({ ...prev, description: e.target.value }))}
              className="mt-1 w-full rounded border border-electric-teal/50 bg-charcoal px-3 py-2 text-electric-teal"
              rows={3}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="rounded px-4 py-2 text-electric-teal hover:bg-electric-teal/10"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(editedInfo);
              onClose();
            }}
            className="rounded border-2 border-electric-teal bg-electric-teal/10 px-4 py-2 text-electric-teal shadow-glow 
              hover:bg-electric-teal/20 hover:shadow-glow-strong"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditModal; 