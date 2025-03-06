'use client';

import { useRouter } from 'next/navigation';
import EditorMode from './index';

export default function EditorPage() {
  const router = useRouter();
  
  const handleClose = () => {
    router.push('/dashboard');
  };
  
  return <EditorMode onClose={handleClose} />;
} 