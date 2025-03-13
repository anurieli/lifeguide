'use client';

import { create } from 'zustand';

interface FeatureDetails {
  id: string;
  feature_title: string;
  feature_description: string;
  use_case: string;
  upvotes: number;
  likes: number;
  status?: 'Complete' | 'In Progress' | 'TBA';
}

interface DialogState {
  isOpen: boolean;
  featureId: string | null;
  featureData: FeatureDetails | null;
  error: string | null;
  openDialog: (featureId: string) => void;
  setFeatureData: (data: FeatureDetails | null) => void;
  setError: (error: string | null) => void;
  closeDialog: () => void;
}

export const useDialogStore = create<DialogState>((set) => ({
  isOpen: false,
  featureId: null,
  featureData: null,
  error: null,
  openDialog: (featureId) => {
    console.log('Opening dialog for feature:', featureId);
    set({ isOpen: true, featureId, error: null });
  },
  setFeatureData: (data) => set({ featureData: data }),
  setError: (error) => set({ error }),
  closeDialog: () => {
    console.log('Closing dialog');
    set({ isOpen: false, featureId: null, featureData: null, error: null });
  },
})); 