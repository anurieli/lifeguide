'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Trash2, Edit2, Heart, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Feature {
  id: string;
  feature_title: string;
  feature_description: string;
  use_case: string;
  upvotes: number;
  likes: number;
  created_at: string;
  updated_at: string;
  status: 'Complete' | 'In Progress' | 'TBA';
}

export function FeatureManager() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingFeatureOpen, setIsAddingFeatureOpen] = useState(false);
  const [isEditingFeatureOpen, setIsEditingFeatureOpen] = useState(false);
  const [newFeature, setNewFeature] = useState({
    feature_title: '',
    feature_description: '',
    use_case: '',
    status: 'TBA' as 'Complete' | 'In Progress' | 'TBA'
  });
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);

  useEffect(() => {
    fetchFeatures();
  }, []);

  const fetchFeatures = async () => {
    setLoading(true);
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('coming_soon')
      .select('*')
      .order('likes', { ascending: false });
    
    if (error) {
      console.error('Error fetching features:', error);
      toast.error("Failed to fetch features.");
    } else if (data) {
      setFeatures(data);
    }
    
    setLoading(false);
  };

  const handleAddFeature = async () => {
    const supabase = createClient();
    const { error } = await supabase
      .from('coming_soon')
      .insert({
        feature_title: newFeature.feature_title,
        feature_description: newFeature.feature_description,
        use_case: newFeature.use_case,
        upvotes: 0,
        likes: 0,
        status: newFeature.status
      });

    if (error) {
      console.error('Error adding feature:', error);
      toast.error("Failed to add feature.");
    } else {
      toast.success("Feature added successfully.");
      setIsAddingFeatureOpen(false);
      setNewFeature({
        feature_title: '',
        feature_description: '',
        use_case: '',
        status: 'TBA'
      });
      fetchFeatures();
    }
  };

  const handleDeleteFeature = async (featureId: string) => {
    try {
      // Show a loading toast that we can dismiss later
      const loadingId = toast.loading("Deleting feature...");
      
      const supabase = createClient();
      console.log(`Attempting to delete feature with ID: ${featureId}`);
      
      // First verify the feature exists
      const { data: featureExists, error: checkError } = await supabase
        .from('coming_soon')
        .select('id, feature_title')
        .eq('id', featureId)
        .single();
        
      if (checkError) {
        console.error('Error checking feature existence:', checkError);
        toast.dismiss(loadingId);
        toast.error("Failed to verify feature exists.");
        return;
      }
      
      if (!featureExists) {
        console.error('Feature not found:', featureId);
        toast.dismiss(loadingId);
        toast.error("Feature not found.");
        return;
      }
      
      console.log(`Found feature to delete: ${JSON.stringify(featureExists)}`);
      
      // Try direct deletion methods - skip RPC function since it's not available
      let deleteSuccess = false;
      
      try {
        // Try using match for more explicit matching
        const { error: deleteError1 } = await supabase
          .from('coming_soon')
          .delete()
          .match({ id: featureId });
          
        if (deleteError1) {
          console.error('First delete attempt failed:', deleteError1);
          
          // Try using eq with explicit casting
          const { error: deleteError2 } = await supabase
            .from('coming_soon')
            .delete()
            .eq('id', featureId);
            
          if (deleteError2) {
            console.error('Second delete attempt failed:', deleteError2);
            toast.dismiss(loadingId);
            toast.error("Failed to delete feature after multiple attempts.");
            return;
          } else {
            deleteSuccess = true;
          }
        } else {
          deleteSuccess = true;
        }
      } catch (deleteError) {
        console.error('Exception during delete operation:', deleteError);
        toast.dismiss(loadingId);
        toast.error("Error during delete operation.");
        return;
      }
      
      // If we got here and deleteSuccess is still false, all attempts failed
      if (!deleteSuccess) {
        toast.dismiss(loadingId);
        toast.error("All deletion attempts failed. Please try again later.");
        return;
      }
      
      // Log success for debugging
      console.log(`Successfully deleted feature with ID: ${featureId}`);
      
      // Dismiss loading toast and show success toast
      toast.dismiss(loadingId);
      toast.success("Feature deleted successfully.");
      
      // Update the local state to remove the deleted feature
      setFeatures(prevFeatures => {
        const newFeatures = prevFeatures.filter(feature => feature.id !== featureId);
        console.log(`Features before: ${prevFeatures.length}, after: ${newFeatures.length}`);
        return newFeatures;
      });
      
      // Wait a moment before fetching fresh data to allow the database to update
      setTimeout(async () => {
        // Verify deletion was successful by checking if the feature still exists
        const { data: checkAfterDelete, error: verifyError } = await supabase
          .from('coming_soon')
          .select('id')
          .eq('id', featureId)
          .single();
          
        if (verifyError && verifyError.code === 'PGRST116') {
          // PGRST116 means no rows returned, which is what we want
          console.log('Verified feature was deleted successfully');
        } else if (checkAfterDelete) {
          console.error('Feature still exists after deletion:', checkAfterDelete);
          toast.error("Feature appears to be deleted but still exists in database. Please refresh the page.");
          
          // Force a refresh of the features list
          fetchFeatures();
        }
      }, 1000);
    } catch (error) {
      console.error('Exception during feature deletion:', error);
      toast.error("An unexpected error occurred.");
    }
  };

  const handleEditFeature = async () => {
    if (!editingFeature) return;
    
    const supabase = createClient();
    const { error } = await supabase
      .from('coming_soon')
      .update({
        feature_title: editingFeature.feature_title,
        feature_description: editingFeature.feature_description,
        use_case: editingFeature.use_case,
        status: editingFeature.status
      })
      .eq('id', editingFeature.id);

    if (error) {
      console.error('Error updating feature:', error);
      toast.error("Failed to update feature.");
    } else {
      toast.success("Feature updated successfully.");
      setIsEditingFeatureOpen(false);
      setEditingFeature(null);
      fetchFeatures();
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">Feature Requests</h2>
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => setIsAddingFeatureOpen(true)}
        >
          Add Feature
        </Button>
      </div>

      <div className="p-4 overflow-y-auto flex-grow">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : features.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            <p>No features yet. Add your first feature!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {features.map((feature) => (
              <div 
                key={feature.id} 
                className="bg-gray-800 p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <div className="flex justify-between">
                  <div className="space-y-2 flex-1 pr-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-white">{feature.feature_title}</h3>
                      {/* Status Badge */}
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        feature.status === 'Complete' ? 'bg-green-500/20 text-green-400' : 
                        feature.status === 'In Progress' ? 'bg-blue-500/20 text-blue-400' : 
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {feature.status}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm">{feature.feature_description}</p>
                    {feature.use_case && (
                      <div className="mt-3 p-2 bg-gray-700/50 rounded text-xs text-gray-300">
                        <p className="font-medium mb-1">Use case:</p>
                        <p>{feature.use_case}</p>
                      </div>
                    )}
                    <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                      <div className="flex items-center">
                        <Heart className="h-4 w-4 mr-1 text-red-500" />
                        <span>{feature.likes}</span>
                      </div>
                      <div className="flex items-center">
                        <ArrowUp className="h-4 w-4 mr-1 text-blue-500" />
                        <span>{feature.upvotes}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {/* Edit Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingFeature(feature);
                        setIsEditingFeatureOpen(true);
                      }}
                      className="h-8 w-8 text-gray-400 hover:text-white"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    
                    {/* Delete Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteFeature(feature.id)}
                      className="h-8 w-8 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Feature Dialog */}
      <Dialog open={isAddingFeatureOpen} onOpenChange={setIsAddingFeatureOpen}>
        <DialogContent className="bg-gray-800 text-white border border-gray-700">
          <DialogHeader>
            <DialogTitle>Add New Feature</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={newFeature.feature_title}
                onChange={(e) => setNewFeature({ ...newFeature, feature_title: e.target.value })}
                placeholder="Feature title"
                className="bg-gray-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newFeature.feature_description}
                onChange={(e) => setNewFeature({ ...newFeature, feature_description: e.target.value })}
                placeholder="Describe the feature"
                className="bg-gray-700 min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Use Case</Label>
              <Textarea
                value={newFeature.use_case}
                onChange={(e) => setNewFeature({ ...newFeature, use_case: e.target.value })}
                placeholder="How would users use this feature?"
                className="bg-gray-700 min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select
                value={newFeature.status}
                onChange={(e) => setNewFeature({ 
                  ...newFeature, 
                  status: e.target.value as 'Complete' | 'In Progress' | 'TBA' 
                })}
                className="w-full bg-gray-700 text-white rounded-md border border-gray-600 p-2"
              >
                <option value="Complete">Complete</option>
                <option value="In Progress">In Progress</option>
                <option value="TBA">TBA</option>
              </select>
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={handleAddFeature}>Add Feature</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Feature Dialog */}
      <Dialog open={isEditingFeatureOpen} onOpenChange={setIsEditingFeatureOpen}>
        <DialogContent className="bg-gray-800 text-white border border-gray-700">
          <DialogHeader>
            <DialogTitle>Edit Feature</DialogTitle>
          </DialogHeader>
          {editingFeature && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editingFeature.feature_title}
                  onChange={(e) => setEditingFeature({ ...editingFeature, feature_title: e.target.value })}
                  className="bg-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingFeature.feature_description}
                  onChange={(e) => setEditingFeature({ ...editingFeature, feature_description: e.target.value })}
                  className="bg-gray-700 min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label>Use Case</Label>
                <Textarea
                  value={editingFeature.use_case}
                  onChange={(e) => setEditingFeature({ ...editingFeature, use_case: e.target.value })}
                  className="bg-gray-700 min-h-[80px]"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  value={editingFeature.status}
                  onChange={(e) => setEditingFeature({ 
                    ...editingFeature, 
                    status: e.target.value as 'Complete' | 'In Progress' | 'TBA' 
                  })}
                  className="w-full bg-gray-700 text-white rounded-md border border-gray-600 p-2"
                >
                  <option value="Complete">Complete</option>
                  <option value="In Progress">In Progress</option>
                  <option value="TBA">TBA</option>
                </select>
              </div>
              <div className="flex justify-end pt-4">
                <Button onClick={handleEditFeature}>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 