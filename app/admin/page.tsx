'use client';

import { useState, useEffect } from 'react';
import { createBrowserSupabaseClient } from '../../lib/supabase';
import { motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Edit2, Trash2, ChevronDown, ChevronUp, Check, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Textarea } from "../../components/ui/textarea"

// Default how-to content
const DEFAULT_HOW_TO_CONTENT = `# How to Use the Blueprint

The Blueprint is a guide that helps you understand and navigate through different aspects of your life. Here's how to use it:

1. **Browse Sections**: Each section represents a major life area
2. **Explore Subsections**: Within each section, you'll find specific topics
3. **Understand Malleability**: The color indicators show how changeable each aspect is:
   - 🟢 Green: Highly malleable
   - 🟡 Yellow: Moderately malleable
   - 🔴 Red: Less malleable

4. **Read Examples**: Each subsection includes practical examples
5. **Take Action**: Use the insights to make informed decisions

Remember, this is a guide, not a strict rulebook. Adapt it to your unique situation.`;

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

interface NewSection {
  title: string;
  description: string;
}

interface NewSubsection {
  section_id: string;
  title: string;
  description: string;
  subdescription: string;
  malleability_level: 'green' | 'yellow' | 'red';
  malleability_details: string;
  example: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [subsections, setSubsections] = useState<Subsection[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [expandedSubsection, setExpandedSubsection] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [howToContent, setHowToContent] = useState(DEFAULT_HOW_TO_CONTENT);
  const [isEditingHowTo, setIsEditingHowTo] = useState(false);
  const [isAddingSectionOpen, setIsAddingSectionOpen] = useState(false);
  const [isAddingSubsectionOpen, setIsAddingSubsectionOpen] = useState(false);
  const [newSection, setNewSection] = useState<NewSection>({ title: '', description: '' });
  const [newSubsection, setNewSubsection] = useState<NewSubsection>({
    section_id: '',
    title: '',
    description: '',
    subdescription: '',
    malleability_level: 'green',
    malleability_details: '',
    example: ''
  });

  const fetchBlueprintData = async () => {
    try {
      console.log('Initializing data fetch...');
      const supabase = createBrowserSupabaseClient();

      // Check authentication status
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError) {
        console.error('Auth error:', authError);
        return;
      }
      console.log('Auth status:', session ? 'Authenticated' : 'Not authenticated');
      if (!session) {
        console.error('No active session - user not authenticated');
        return;
      }

      // Test the connection first
      const { data: testData, error: testError } = await supabase
        .from('guide_sections')
        .select('count');

      if (testError) {
        console.error('Connection test failed:', testError);
        return;
      }

      console.log('Connection test successful');

      // Fetch sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('guide_sections')
        .select('*')
        .order('order_position');

      if (sectionsError) {
        console.error('Error fetching sections:', sectionsError);
        return;
      }

      console.log('Fetched sections:', sectionsData);

      // Fetch subsections
      const { data: subsectionsData, error: subsectionsError } = await supabase
        .from('guide_subsections')
        .select(`
          id,
          section_id,
          title,
          description,
          subdescription,
          malleability_level,
          malleability_details,
          example,
          order_position
        `)
        .order('order_position');

      if (subsectionsError) {
        console.error('Error fetching subsections:', subsectionsError);
        return;
      }

      console.log('Fetched subsections:', subsectionsData);

      if (sectionsData) setSections(sectionsData);
      if (subsectionsData) {
        setSubsections(subsectionsData);
      }

    } catch (error) {
      console.error('Unexpected error in fetchBlueprintData:', error);
    }
  };

  useEffect(() => {
    fetchBlueprintData();

    // Set up realtime subscription for changes
    const supabase = createBrowserSupabaseClient();
    
    console.log('Setting up realtime subscriptions...');

    const sectionsSubscription = supabase
      .channel('guide_sections_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'guide_sections' }, 
        (payload) => {
          console.log('Sections change received:', payload);
          fetchBlueprintData();
        }
      )
      .subscribe((status) => {
        console.log('Sections subscription status:', status);
      });

    const subsectionsSubscription = supabase
      .channel('guide_subsections_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'guide_subsections' }, 
        (payload) => {
          console.log('Subsections change received:', payload);
          fetchBlueprintData();
        }
      )
      .subscribe((status) => {
        console.log('Subsections subscription status:', status);
      });
    
    // Load how-to content from localStorage if it exists
    const savedHowTo = localStorage.getItem('blueprint_how_to');
    if (savedHowTo) {
      setHowToContent(savedHowTo);
    }

    // Cleanup subscriptions
    return () => {
      console.log('Cleaning up subscriptions...');
      sectionsSubscription.unsubscribe();
      subsectionsSubscription.unsubscribe();
    };
  }, []);

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const sectionId = result.destination.droppableId;
    const sectionSubsections = subsections.filter(sub => sub.section_id === sectionId);
    const items = Array.from(sectionSubsections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order_position for affected items
    const updatedItems = items.map((item, index) => ({
      ...item,
      order_position: index,
    }));

    // Update local state
    const newSubsections = subsections.map(sub => {
      if (sub.section_id === sectionId) {
        const updatedItem = updatedItems.find(item => item.id === sub.id);
        return updatedItem || sub;
      }
      return sub;
    });
    setSubsections(newSubsections);

    // Initialize Supabase client and update in database
    const supabase = createBrowserSupabaseClient();
    await supabase.from('guide_subsections').upsert(
      updatedItems.map(({ id, order_position }) => ({
        id,
        order_position,
      }))
    );
  };

  const handleHowToSave = () => {
    // Save to localStorage
    localStorage.setItem('blueprint_how_to', howToContent);
    setIsEditingHowTo(false);
  };

  const handleAddSection = async () => {
    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase
      .from('guide_sections')
      .insert({
        title: newSection.title,
        description: newSection.description,
        order_position: sections.length
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding section:', error);
      return;
    }

    setIsAddingSectionOpen(false);
    setNewSection({ title: '', description: '' });
    await fetchBlueprintData();
  };

  const handleAddSubsection = async () => {
    const supabase = createBrowserSupabaseClient();
    const sectionSubsections = subsections.filter(sub => sub.section_id === newSubsection.section_id);
    
    const { data, error } = await supabase
      .from('guide_subsections')
      .insert({
        section_id: newSubsection.section_id,
        title: newSubsection.title,
        description: newSubsection.description,
        subdescription: newSubsection.subdescription,
        malleability_level: newSubsection.malleability_level,
        malleability_details: newSubsection.malleability_details,
        example: newSubsection.example,
        order_position: sectionSubsections.length
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding subsection:', error);
      return;
    }

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

  return (
    <div className="min-h-screen pt-24 px-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Blueprint Management</h1>
      </div>

      {/* How-To Guide Editor */}
      <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-white">How-To Guide</h2>
          {isEditingHowTo ? (
            <button
              onClick={handleHowToSave}
              className="p-2 bg-green-600 rounded-full hover:bg-green-700 transition-colors"
            >
              <Check size={20} className="text-white" />
            </button>
          ) : (
            <button
              onClick={() => setIsEditingHowTo(true)}
              className="p-2 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors"
            >
              <Edit2 size={20} className="text-white" />
            </button>
          )}
        </div>
        {isEditingHowTo ? (
          <textarea
            value={howToContent}
            onChange={(e) => setHowToContent(e.target.value)}
            className="w-full h-64 bg-gray-800 text-white rounded-lg p-4 focus:ring-2 focus:ring-blue-500"
            placeholder="Enter markdown content..."
          />
        ) : (
          <div className="prose prose-invert max-w-none text-white">
            <ReactMarkdown>{howToContent}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* Add Section/Subsection Buttons */}
      <div className="flex gap-4">
        <Dialog open={isAddingSectionOpen} onOpenChange={(open) => {
          setIsAddingSectionOpen(open);
          if (!open) {
            setNewSection({ title: '', description: '' });
          }
        }}>
          <DialogTrigger asChild>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
              <Plus size={20} />
              Add Section
            </button>
          </DialogTrigger>
          <DialogContent className="bg-gray-800 text-white">
            <DialogHeader>
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
              <button
                onClick={handleAddSection}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Section
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Blueprint Editor */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-white">Blueprint Sections</h2>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="space-y-6">
            {sections.map((section) => (
              <div
                key={section.id}
                className="bg-white/10 rounded-xl overflow-hidden backdrop-blur-sm"
              >
                <div className="p-6">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white">{section.title}</h3>
                      <p className="text-gray-400">{section.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setExpandedSection(
                          expandedSection === section.id ? null : section.id
                        )}
                        className="p-2 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors"
                      >
                        {expandedSection === section.id ? (
                          <ChevronUp size={20} className="text-white" />
                        ) : (
                          <ChevronDown size={20} className="text-white" />
                        )}
                      </button>
                      <button
                        onClick={() => setEditingItem(section.id)}
                        className="p-2 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors"
                      >
                        <Edit2 size={20} className="text-white" />
                      </button>
                      <button
                        onClick={() => {/* TODO: Delete section */}}
                        className="p-2 bg-red-600/20 rounded-full hover:bg-red-600/40 transition-colors"
                      >
                        <Trash2 size={20} className="text-red-500" />
                      </button>
                    </div>
                  </div>

                  {expandedSection === section.id && (
                    <>
                      <div className="mt-4 flex justify-end">
                        <Dialog open={isAddingSubsectionOpen} onOpenChange={(open) => {
                          setIsAddingSubsectionOpen(open);
                          if (open) {
                            setNewSubsection(prev => ({ ...prev, section_id: section.id }));
                          } else {
                            setNewSubsection({
                              section_id: '',
                              title: '',
                              description: '',
                              subdescription: '',
                              malleability_level: 'green',
                              malleability_details: '',
                              example: ''
                            });
                          }
                        }}>
                          <DialogTrigger asChild>
                            <button
                              className="px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/40 transition-colors flex items-center gap-1.5 text-sm"
                            >
                              <Plus size={16} />
                              Add Subsection
                            </button>
                          </DialogTrigger>
                          <DialogContent className="bg-gray-800 text-white">
                            <DialogHeader>
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
                                  onValueChange={(value: 'green' | 'yellow' | 'red') => setNewSubsection({ ...newSubsection, malleability_level: value })}
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
                              <button
                                onClick={handleAddSubsection}
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                Add Subsection
                              </button>
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
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`bg-gray-800/50 rounded-lg p-4 ${
                                        snapshot.isDragging ? 'opacity-100' : ''
                                      }`}
                                      style={{
                                        ...provided.draggableProps.style,
                                      }}
                                    >
                                      <div className="flex justify-between items-center">
                                        <h4 className="text-white font-medium">
                                          {subsection.title}
                                        </h4>
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => setExpandedSubsection(
                                              expandedSubsection === subsection.id ? null : subsection.id
                                            )}
                                            className="p-1 hover:bg-gray-700 rounded-full transition-colors"
                                          >
                                            {expandedSubsection === subsection.id ? (
                                              <ChevronUp size={16} className="text-white" />
                                            ) : (
                                              <ChevronDown size={16} className="text-white" />
                                            )}
                                          </button>
                                          <button
                                            onClick={() => setEditingItem(subsection.id)}
                                            className="p-1 hover:bg-gray-700 rounded-full transition-colors"
                                          >
                                            <Edit2 size={16} className="text-white" />
                                          </button>
                                          <button
                                            onClick={() => {/* TODO: Delete subsection */}}
                                            className="p-1 hover:bg-red-600/20 rounded-full transition-colors"
                                          >
                                            <Trash2 size={16} className="text-red-500" />
                                          </button>
                                        </div>
                                      </div>

                                      {expandedSubsection === subsection.id && (
                                        <div className="mt-4 space-y-2 text-sm text-gray-300">
                                          <p><span className="font-medium">Description:</span> {subsection.description}</p>
                                          <p><span className="font-medium">Subdescription:</span> {subsection.subdescription}</p>
                                          <p>
                                            <span className="font-medium">Malleability:</span>
                                            <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                                              subsection.malleability_level === 'green' ? 'bg-green-500/20 text-green-400' :
                                              subsection.malleability_level === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
                                              'bg-red-500/20 text-red-400'
                                            }`}>
                                              {subsection.malleability_level}
                                            </span>
                                          </p>
                                          <p><span className="font-medium">Malleability Details:</span> {subsection.malleability_details}</p>
                                          <p><span className="font-medium">Example:</span> {subsection.example}</p>
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
      </div>
    </div>
  )
} 