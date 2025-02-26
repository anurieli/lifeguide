'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Edit2, Trash2, ChevronDown, ChevronUp, Check, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { HowToGuide } from '@/components/HowToGuide';

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

export default function AdminDashboard() {
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

  useEffect(() => {
    fetchBlueprintData();
  }, []);

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

        {/* How-To Guide Editor */}
        <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-white">How-To Guide</h2>
          </div>
          <HowToGuide isEditable={true} showButton={false} displayMode="inline" />
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
                      <p className="text-gray-400 mt-1">{section.description}</p>
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
                                          <p className="text-gray-400 mt-1">{subsection.description}</p>
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
                                            <p className="text-gray-400 mt-1">{subsection.subdescription}</p>
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
                                            <p className="text-gray-400 mt-1">{subsection.malleability_details}</p>
                                          </div>
                                          <div>
                                            <span className="text-gray-300 font-medium">Example:</span>
                                            <p className="text-gray-400 mt-1">{subsection.example}</p>
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
          <DialogContent className="bg-gray-800 text-white">
            <DialogHeader>
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
              <button
                onClick={handleEditSection}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Edit Subsection Dialog */}
        <Dialog open={isEditingSubsectionOpen} onOpenChange={setIsEditingSubsectionOpen}>
          <DialogContent className="bg-gray-800 text-white">
            <DialogHeader>
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
              <button
                onClick={handleEditSubsection}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 