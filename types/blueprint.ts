// Types for the Life Blueprint application

// Section represents a main category in the blueprint
export interface Section {
  id: string;
  title: string;
  description: string;
  order_position: number;
  subdescription?: string;
}

// Subsection represents a specific question or topic within a section
export interface Subsection {
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

// UserResponse represents a user's answer to a subsection
export interface UserResponse {
  id: string;
  user_id: string;
  subsection_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// UserProgress tracks completion status and bookmarks
export interface UserProgress {
  id: string;
  user_id: string;
  subsection_id: string;
  completed: boolean;
  flagged: boolean;
  created_at: string;
  updated_at: string;
}

// DashboardMode represents the current view mode
export interface DashboardMode {
  type: 'view' | 'edit';
  section?: number;
}

// CommittedResponse tracks which responses are committed
export interface CommittedResponse {
  subsectionId: string;
  isCommitted: boolean;
}

// ProTip represents helpful advice for users
export interface ProTip {
  id: string;
  title: string;
  description: string;
}

// SectionStatus represents the current status of a section
export interface SectionStatus {
  isComplete: boolean; 
  canEdit: boolean;
  canCommit: boolean;
} 