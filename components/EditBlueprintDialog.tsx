'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { Label, Textarea } from '@/components/ui/label';

interface EditBlueprintDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string | null;
  itemType: 'section' | 'subsection';
  onSave: () => void;
}

interface FormData {
  title: string;
  description: string;
  subdescription: string;
  malleability_level: 'green' | 'yellow' | 'red';
  malleability_details: string;
  example: string;
}

export default function EditBlueprintDialog({
  isOpen,
  onClose,
  itemId,
  itemType,
  onSave,
}: EditBlueprintDialogProps) {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    subdescription: '',
    malleability_level: 'green',
    malleability_details: '',
    example: '',
  });
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    if (isOpen && itemId) {
      fetchItemData();
    }
  }, [isOpen, itemId, fetchItemData]);

  const fetchItemData = async () => {
    const { data } = await supabase
      .from(itemType === 'section' ? 'guide_sections' : 'guide_subsections')
      .select('*')
      .eq('id', itemId)
      .single();

    if (data) {
      setFormData(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const table = itemType === 'section' ? 'guide_sections' : 'guide_subsections';
    const { error } = await supabase
      .from(table)
      .upsert({
        id: itemId,
        ...formData,
      });

    if (!error) {
      onSave();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 text-white border-gray-800">
        <DialogHeader>
          <DialogTitle>
            {itemType === 'section' ? 'Edit Section' : 'Edit Subsection'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          {itemType === 'subsection' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Subdescription</label>
                <textarea
                  value={formData.subdescription}
                  onChange={(e) => setFormData({ ...formData, subdescription: e.target.value })}
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Malleability Level</label>
                <select
                  value={formData.malleability_level}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    malleability_level: e.target.value as 'green' | 'yellow' | 'red'
                  })}
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="green">Green</option>
                  <option value="yellow">Yellow</option>
                  <option value="red">Red</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Malleability Details</Label>
                <Textarea
                  value={formData.malleability_details}
                  onChange={(e) => setFormData({ ...formData, malleability_details: e.target.value })}
                  placeholder="Enter malleability details"
                  className="bg-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Example</label>
                <textarea
                  value={formData.example}
                  onChange={(e) => setFormData({ ...formData, example: e.target.value })}
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 