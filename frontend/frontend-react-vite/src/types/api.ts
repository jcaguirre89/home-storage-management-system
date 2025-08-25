export interface Item {
  id: string;
  name: string;
  location: string;
  status: 'STORED' | 'OUT';
  creatorUserId: string;
  householdId: string;
  isPrivate: boolean;
  lastUpdated: string;
  metadata?: {
    category?: string;
    notes?: string;
  };
}

export interface Household {
  id: string;
  name: string;
  ownerUserId: string;
  memberUserIds: string[];
  created: string;
}

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
}
