'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Edit2, Trash2, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { HowToGuide } from '@/components/HowToGuide';
import { FeatureManager } from '@/components/FeatureManager';
import { useAuth } from '@/utils/AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Section {
  id: string;
  title: string;
  description: string;
  order_position: number;
}

interface Subsection {
  id: string;
  section_id: string;
  title: string;
  description: string;
  subdescription: string;
  malleability_level: 'green' | 'yellow' | 'red';
  malleability_details: string;
  example: string;
  order_position: number;
}

export default function AdminDashboard() {
  const { user, loading, error } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckComplete, setAdminCheckComplete] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [subsections, setSubsections] = useState<Subsection[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [expandedSubsection, setExpandedSubsection] = useState<string | null>(null);
  const [isAddingSectionOpen, setIsAddingSectionOpen] = useState(false);
  const [isAddingSubsectionOpen, setIsAddingSubsectionOpen] = useState(false);
  const [isEditingSectionOpen, setIsEditingSectionOpen] = useState(false);
  const [isEditingSubsectionOpen, setIsEditingSubsectionOpen] = useState(false);
  const [newSection, setNewSection] = useState({ title: '', description: '' });
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editingSubsection, setEditingSubsection] = useState<Subsection | null>(null);
  const [newSubsection, setNewSubsection] = useState({
    section_id: '',
    title: '',
    description: '',
    subdescription: '',
    malleability_level: 'green' as 'green' | 'yellow' | 'red',
    malleability_details: '',
    example: ''
  });

  const fetchBlueprintData = async () => {
    const supabase = createClient();
    
    const { data: sectionsData } = await supabase
      .from('guide_sections')
      .select('*')
      .order('order_position');

    const { data: subsectionsData } = await supabase
      .from('guide_subsections')
      .select('*')
      .order('order_position');

    if (sectionsData) setSections(sectionsData);
    if (subsectionsData) setSubsections(subsectionsData);
  };

  useEffect(() => {
    fetchBlueprintData();
  }, []);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      
      const supabase = createClient();
      const { data } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', user.email)
        .single();
      
      setIsAdmin(!!data);
      setAdminCheckComplete(true);
    };

    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  // If still loading, show a loading state
  if (loading || !adminCheckComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  // If there's an error, no user, or user is not an admin
  if (error || !user || !isAdmin) {
    // Redirect to dashboard if not an admin
    if (user && !isAdmin) {
      router.push('/dashboard');
      return null;
    }
    
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-center max-w-md p-6 bg-gray-800 rounded-lg shadow-lg">
          <Trash2 className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="mt-4 text-xl font-bold text-white">Access Denied</h2>
          <p className="mt-2 text-gray-400">
            {error || "You don't have permission to access this page."}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex justify-center space-x-4">
              <Link href="/dashboard" className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Go to Dashboard
              </Link>
              <Link href="/auth/login" className="inline-block px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                Login as Admin
              </Link>
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 inline-block px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Refresh Page
            </button>
            <div className="mt-2 p-2 bg-gray-700 rounded text-xs text-left text-gray-300">
              <p>Debug info:</p>
              <p>User: {user ? 'Exists' : 'Not found'}</p>
              <p>Admin: {isAdmin ? 'Yes' : 'No'}</p>
              <p>Error: {error || 'None'}</p>
              <p>Admin check complete: {adminCheckComplete ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }


  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const sectionId = result.destination.droppableId;
    const sectionSubsections = subsections.filter(sub => sub.section_id === sectionId);
    const items = Array.from(sectionSubsections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      order_position: index,
    }));

    const newSubsections = subsections.map(sub => {
      if (sub.section_id === sectionId) {
        const updatedItem = updatedItems.find(item => item.id === sub.id);
        return updatedItem || sub;
      }
      return sub;
    });
    setSubsections(newSubsections);

    const supabase = createClient();
    await supabase.from('guide_subsections').upsert(
      updatedItems.map(({ id, order_position }) => ({
        id,
        order_position,
      }))
    );
  };

  const handleAddSection = async () => {
    const supabase = createClient();
    await supabase
      .from('guide_sections')
      .insert({
        title: newSection.title,
        description: newSection.description,
        order_position: sections.length
      });

    setIsAddingSectionOpen(false);
    setNewSection({ title: '', description: '' });
    await fetchBlueprintData();
  };

  const handleAddSubsection = async () => {
    const supabase = createClient();
    const sectionSubsections = subsections.filter(sub => sub.section_id === newSubsection.section_id);
    
    await supabase
      .from('guide_subsections')
      .insert({
        ...newSubsection,
        order_position: sectionSubsections.length
      });

    setIsAddingSubsectionOpen(false);
    setNewSubsection({
      section_id: '',
      title: '',
      description: '',
      subdescription: '',
      malleability_level: 'green',
      malleability_details: '',
      example: ''
    });
    await fetchBlueprintData();
  };

  const handleDeleteSection = async (sectionId: string) => {
    const supabase = createClient();
    await supabase.from('guide_sections').delete().eq('id', sectionId);
    await fetchBlueprintData();
  };

  const handleDeleteSubsection = async (subsectionId: string) => {
    const supabase = createClient();
    await supabase.from('guide_subsections').delete().eq('id', subsectionId);
    await fetchBlueprintData();
  };

  const handleEditSection = async () => {
    if (!editingSection) return;
    
    const supabase = createClient();
    await supabase
      .from('guide_sections')
      .update({
        title: editingSection.title,
        description: editingSection.description
      })
      .eq('id', editingSection.id);

    setIsEditingSectionOpen(false);
    setEditingSection(null);
    await fetchBlueprintData();
  };

  const handleEditSubsection = async () => {
    if (!editingSubsection) return;
    
    const supabase = createClient();
    await supabase
      .from('guide_subsections')
      .update({
        title: editingSubsection.title,
        description: editingSubsection.description,
        subdescription: editingSubsection.subdescription,
        malleability_level: editingSubsection.malleability_level,
        malleability_details: editingSubsection.malleability_details,
        example: editingSubsection.example
      })
      .eq('id', editingSubsection.id);

    setIsEditingSubsectionOpen(false);
    setEditingSubsection(null);
    await fetchBlueprintData();
  };

  return (
    <div className="min-h-screen pt-24 px-4 md:px-8 pb-16">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
          Blueprint Management
        </h1>

        {/* Admin Tools Section */}
        <div className="flex flex-col md:flex-row gap-8 mb-8">
          {/* How-To Guide Editor */}
          <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10 w-full md:w-1/2 h-[500px]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-white">How-To Guide</h2>
            </div>
            <div className="h-[calc(100%-60px)]">
              <HowToGuide isEditable={true} showButton={false} displayMode="inline" />
            </div>
          </div>

          {/* Feature Manager */}
          <div className="w-full md:w-1/2 h-[500px]">
            <FeatureManager />
          </div>
        </div>

        {/* Add Section Button */}
        <div className="mb-8">
          <Dialog open={isAddingSectionOpen} onOpenChange={setIsAddingSectionOpen}>
            <DialogTrigger asChild>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Section
              </button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 text-white max-h-[90vh] overflow-y-auto">
              <DialogHeader className="sticky top-0 bg-gray-800 z-10 py-4 border-b border-gray-700">
                <DialogTitle>Add New Section</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={newSection.title}
                    onChange={(e) => setNewSection({ ...newSection, title: e.target.value })}
                    placeholder="Enter section title"
                    className="bg-gray-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newSection.description}
                    onChange={(e) => setNewSection({ ...newSection, description: e.target.value })}
                    placeholder="Enter section description"
                    className="bg-gray-700"
                  />
                </div>
                <div className="sticky bottom-0 bg-gray-800 py-4 border-t border-gray-700">
                  <button
                    onClick={handleAddSection}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Section
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Blueprint Sections */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="space-y-6">
            {sections.map((section) => (
              <div
                key={section.id}
                className="bg-white/5 rounded-xl overflow-hidden backdrop-blur-sm border border-white/10"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-semibold text-white">{section.title}</h3>
                      <div className="prose prose-invert max-w-none">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="text-gray-400 mt-1">{children}</p>,
                            strong: ({ children }) => <strong className="text-white">{children}</strong>,
                            em: ({ children }) => <em className="text-gray-300">{children}</em>,
                            ul: ({ children }) => <ul className="list-disc pl-4 text-gray-400">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-4 text-gray-400">{children}</ol>,
                            li: ({ children }) => <li className="text-gray-400">{children}</li>
                          }}
                        >
                          {section.description}
                        </ReactMarkdown>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                        className="p-2 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors"
                      >
                        {expandedSection === section.id ? (
                          <ChevronUp className="h-5 w-5 text-white" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-white" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setEditingSection(section);
                          setIsEditingSectionOpen(true);
                        }}
                        className="p-2 bg-blue-500/20 rounded-full hover:bg-blue-500/40 transition-colors"
                      >
                        <Edit2 className="h-5 w-5 text-blue-500" />
                      </button>
                      <button
                        onClick={() => handleDeleteSection(section.id)}
                        className="p-2 bg-red-500/20 rounded-full hover:bg-red-500/40 transition-colors"
                      >
                        <Trash2 className="h-5 w-5 text-red-500" />
                      </button>
                    </div>
                  </div>

                  {expandedSection === section.id && (
                    <>
                      <div className="mt-4 flex justify-end">
                        <Dialog open={isAddingSubsectionOpen} onOpenChange={setIsAddingSubsectionOpen}>
                          <DialogTrigger asChild>
                            <button
                              onClick={() => setNewSubsection(prev => ({ ...prev, section_id: section.id }))}
                              className="px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/40 transition-colors flex items-center gap-1.5 text-sm"
                            >
                              <Plus className="h-4 w-4" />
                              Add Subsection
                            </button>
                          </DialogTrigger>
                          <DialogContent className="bg-gray-800 text-white max-h-[90vh] overflow-y-auto">
                            <DialogHeader className="sticky top-0 bg-gray-800 z-10 py-4 border-b border-gray-700">
                              <DialogTitle>Add New Subsection</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                              <div className="space-y-2">
                                <Label>Title</Label>
                                <Input
                                  value={newSubsection.title}
                                  onChange={(e) => setNewSubsection({ ...newSubsection, title: e.target.value })}
                                  placeholder="Enter subsection title"
                                  className="bg-gray-700"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                  value={newSubsection.description}
                                  onChange={(e) => setNewSubsection({ ...newSubsection, description: e.target.value })}
                                  placeholder="Enter subsection description"
                                  className="bg-gray-700"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Subdescription</Label>
                                <Textarea
                                  value={newSubsection.subdescription}
                                  onChange={(e) => setNewSubsection({ ...newSubsection, subdescription: e.target.value })}
                                  placeholder="Enter subdescription"
                                  className="bg-gray-700"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Malleability Level</Label>
                                <Select
                                  value={newSubsection.malleability_level}
                                  onValueChange={(value: 'green' | 'yellow' | 'red') => 
                                    setNewSubsection({ ...newSubsection, malleability_level: value })
                                  }
                                >
                                  <SelectTrigger className="bg-gray-700">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-gray-700">
                                    <SelectItem value="green">Green</SelectItem>
                                    <SelectItem value="yellow">Yellow</SelectItem>
                                    <SelectItem value="red">Red</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Malleability Details</Label>
                                <Textarea
                                  value={newSubsection.malleability_details}
                                  onChange={(e) => setNewSubsection({ ...newSubsection, malleability_details: e.target.value })}
                                  placeholder="Enter malleability details"
                                  className="bg-gray-700"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Example</Label>
                                <Textarea
                                  value={newSubsection.example}
                                  onChange={(e) => setNewSubsection({ ...newSubsection, example: e.target.value })}
                                  placeholder="Enter example"
                                  className="bg-gray-700"
                                />
                              </div>
                              <div className="sticky bottom-0 bg-gray-800 py-4 border-t border-gray-700">
                                <button
                                  onClick={handleAddSubsection}
                                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  Add Subsection
                                </button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>

                      <Droppable droppableId={section.id}>
                        {(provided) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="mt-4 space-y-4"
                          >
                            {subsections
                              .filter((sub) => sub.section_id === section.id)
                              .map((subsection, index) => (
                                <Draggable
                                  key={subsection.id}
                                  draggableId={subsection.id}
                                  index={index}
                                >
                                  {(provided) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className="bg-gray-800/50 rounded-lg p-4"
                                    >
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <h4 className="text-white font-medium">{subsection.title}</h4>
                                          <div className="prose prose-invert max-w-none">
                                            <ReactMarkdown
                                              components={{
                                                p: ({ children }) => <p className="text-gray-400 mt-1">{children}</p>,
                                                strong: ({ children }) => <strong className="text-white">{children}</strong>,
                                                em: ({ children }) => <em className="text-gray-300">{children}</em>,
                                                ul: ({ children }) => <ul className="list-disc pl-4 text-gray-400">{children}</ul>,
                                                ol: ({ children }) => <ol className="list-decimal pl-4 text-gray-400">{children}</ol>,
                                                li: ({ children }) => <li className="text-gray-400">{children}</li>
                                              }}
                                            >
                                              {subsection.description}
                                            </ReactMarkdown>
                                          </div>
                                        </div>
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => setExpandedSubsection(
                                              expandedSubsection === subsection.id ? null : subsection.id
                                            )}
                                            className="p-1.5 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors"
                                          >
                                            {expandedSubsection === subsection.id ? (
                                              <ChevronUp className="h-4 w-4 text-white" />
                                            ) : (
                                              <ChevronDown className="h-4 w-4 text-white" />
                                            )}
                                          </button>
                                          <button
                                            onClick={() => {
                                              setEditingSubsection(subsection);
                                              setIsEditingSubsectionOpen(true);
                                            }}
                                            className="p-1.5 bg-blue-500/20 rounded-full hover:bg-blue-500/40 transition-colors"
                                          >
                                            <Edit2 className="h-4 w-4 text-blue-500" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteSubsection(subsection.id)}
                                            className="p-1.5 bg-red-500/20 rounded-full hover:bg-red-500/40 transition-colors"
                                          >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                          </button>
                                        </div>
                                      </div>

                                      {expandedSubsection === subsection.id && (
                                        <div className="mt-4 space-y-3 text-sm">
                                          <div>
                                            <span className="text-gray-300 font-medium">Subdescription:</span>
                                            <div className="prose prose-invert max-w-none">
                                              <ReactMarkdown
                                                components={{
                                                  p: ({ children }) => <p className="text-gray-400 mt-1">{children}</p>,
                                                  strong: ({ children }) => <strong className="text-white">{children}</strong>,
                                                  em: ({ children }) => <em className="text-gray-300">{children}</em>,
                                                  ul: ({ children }) => <ul className="list-disc pl-4 text-gray-400">{children}</ul>,
                                                  ol: ({ children }) => <ol className="list-decimal pl-4 text-gray-400">{children}</ol>,
                                                  li: ({ children }) => <li className="text-gray-400">{children}</li>
                                                }}
                                              >
                                                {subsection.subdescription}
                                              </ReactMarkdown>
                                            </div>
                                          </div>
                                          <div>
                                            <span className="text-gray-300 font-medium">Malleability Level:</span>
                                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                                              subsection.malleability_level === 'green' ? 'bg-green-500/20 text-green-400' :
                                              subsection.malleability_level === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
                                              'bg-red-500/20 text-red-400'
                                            }`}>
                                              {subsection.malleability_level}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-gray-300 font-medium">Malleability Details:</span>
                                            <div className="prose prose-invert max-w-none">
                                              <ReactMarkdown
                                                components={{
                                                  p: ({ children }) => <p className="text-gray-400 mt-1">{children}</p>,
                                                  strong: ({ children }) => <strong className="text-white">{children}</strong>,
                                                  em: ({ children }) => <em className="text-gray-300">{children}</em>,
                                                  ul: ({ children }) => <ul className="list-disc pl-4 text-gray-400">{children}</ul>,
                                                  ol: ({ children }) => <ol className="list-decimal pl-4 text-gray-400">{children}</ol>,
                                                  li: ({ children }) => <li className="text-gray-400">{children}</li>
                                                }}
                                              >
                                                {subsection.malleability_details}
                                              </ReactMarkdown>
                                            </div>
                                          </div>
                                          <div>
                                            <span className="text-gray-300 font-medium">Example:</span>
                                            <div className="prose prose-invert max-w-none">
                                              <ReactMarkdown
                                                components={{
                                                  p: ({ children }) => <p className="text-gray-400 mt-1">{children}</p>,
                                                  strong: ({ children }) => <strong className="text-white">{children}</strong>,
                                                  em: ({ children }) => <em className="text-gray-300">{children}</em>,
                                                  ul: ({ children }) => <ul className="list-disc pl-4 text-gray-400">{children}</ul>,
                                                  ol: ({ children }) => <ol className="list-decimal pl-4 text-gray-400">{children}</ol>,
                                                  li: ({ children }) => <li className="text-gray-400">{children}</li>
                                                }}
                                              >
                                                {subsection.example}
                                              </ReactMarkdown>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DragDropContext>

        {/* Add Edit Section Dialog */}
        <Dialog open={isEditingSectionOpen} onOpenChange={setIsEditingSectionOpen}>
          <DialogContent className="bg-gray-800 text-white max-h-[90vh] overflow-y-auto">
            <DialogHeader className="sticky top-0 bg-gray-800 z-10 py-4 border-b border-gray-700">
              <DialogTitle>Edit Section</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editingSection?.title ?? ''}
                  onChange={(e) => setEditingSection(prev => prev ? { ...prev, title: e.target.value } : null)}
                  placeholder="Enter section title"
                  className="bg-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingSection?.description ?? ''}
                  onChange={(e) => setEditingSection(prev => prev ? { ...prev, description: e.target.value } : null)}
                  placeholder="Enter section description"
                  className="bg-gray-700"
                />
              </div>
              <div className="sticky bottom-0 bg-gray-800 py-4 border-t border-gray-700">
                <button
                  onClick={handleEditSection}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Edit Subsection Dialog */}
        <Dialog open={isEditingSubsectionOpen} onOpenChange={setIsEditingSubsectionOpen}>
          <DialogContent className="bg-gray-800 text-white max-h-[90vh] overflow-y-auto">
            <DialogHeader className="sticky top-0 bg-gray-800 z-10 py-4 border-b border-gray-700">
              <DialogTitle>Edit Subsection</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editingSubsection?.title ?? ''}
                  onChange={(e) => setEditingSubsection(prev => prev ? { ...prev, title: e.target.value } : null)}
                  placeholder="Enter subsection title"
                  className="bg-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingSubsection?.description ?? ''}
                  onChange={(e) => setEditingSubsection(prev => prev ? { ...prev, description: e.target.value } : null)}
                  placeholder="Enter subsection description"
                  className="bg-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label>Subdescription</Label>
                <Textarea
                  value={editingSubsection?.subdescription ?? ''}
                  onChange={(e) => setEditingSubsection(prev => prev ? { ...prev, subdescription: e.target.value } : null)}
                  placeholder="Enter subdescription"
                  className="bg-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label>Malleability Level</Label>
                <Select
                  value={editingSubsection?.malleability_level ?? 'green'}
                  onValueChange={(value: 'green' | 'yellow' | 'red') => 
                    setEditingSubsection(prev => prev ? { ...prev, malleability_level: value } : null)
                  }
                >
                  <SelectTrigger className="bg-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700">
                    <SelectItem value="green">Green</SelectItem>
                    <SelectItem value="yellow">Yellow</SelectItem>
                    <SelectItem value="red">Red</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Malleability Details</Label>
                <Textarea
                  value={editingSubsection?.malleability_details ?? ''}
                  onChange={(e) => setEditingSubsection(prev => prev ? { ...prev, malleability_details: e.target.value } : null)}
                  placeholder="Enter malleability details"
                  className="bg-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label>Example</Label>
                <Textarea
                  value={editingSubsection?.example ?? ''}
                  onChange={(e) => setEditingSubsection(prev => prev ? { ...prev, example: e.target.value } : null)}
                  placeholder="Enter example"
                  className="bg-gray-700"
                />
              </div>
              <div className="sticky bottom-0 bg-gray-800 py-4 border-t border-gray-700">
                <button
                  onClick={handleEditSubsection}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 