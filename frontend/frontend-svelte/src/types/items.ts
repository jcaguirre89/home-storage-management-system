export interface Item {
  id: string; // Assuming items have an ID once created
  name: string;
  location: string; // A1-D4 format
  status: 'STORED' | 'OUT';
  creatorUserId: string;
  householdId: string;
  isPrivate: boolean;
  lastUpdated: string; // ISO datetime
  metadata?: {
    category?: string;
    notes?: string;
  };
}

export interface ItemFormData {
  name: string;
  location: string;
  isPrivate?: boolean; // Optional in form, might default
  status?: 'STORED' | 'OUT'; // Usually set by system, but form might allow override
  metadata?: {
    category?: string;
    notes?: string;
  };
}

export interface ApiError {
  code: string;
  message: string;
}

// Standard API Response structure from your project context
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
}