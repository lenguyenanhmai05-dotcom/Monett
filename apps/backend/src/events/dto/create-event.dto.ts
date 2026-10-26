export class CreateEventDto {
  title: string;
  startDate: string;
  endDate?: string;
  location?: string;
  estimatedBudget: number;
  description?: string;
  status?: 'upcoming' | 'ongoing' | 'completed';
}

export class UpdateEventDto {
  title?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  estimatedBudget?: number;
  spentAmount?: number;
  incomeAmount?: number;
  description?: string;
  status?: 'upcoming' | 'ongoing' | 'completed';
  expenses?: any[];
  members?: any[];
}

export class InviteFriendDto {
  recipientId: string;
  recipientName: string;
  recipientEmail?: string;
  avatarUrl?: string;
}
