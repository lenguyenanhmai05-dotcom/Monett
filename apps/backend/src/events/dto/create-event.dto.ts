import { IsString, IsNotEmpty, IsOptional, IsNumber, IsIn, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  startDate: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  estimatedBudget?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @IsIn(['upcoming', 'ongoing', 'completed'])
  status?: 'upcoming' | 'ongoing' | 'completed';
}

export class UpdateEventDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  estimatedBudget?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  spentAmount?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  incomeAmount?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @IsIn(['upcoming', 'ongoing', 'completed'])
  status?: 'upcoming' | 'ongoing' | 'completed';

  @IsArray()
  @IsOptional()
  expenses?: any[];

  @IsArray()
  @IsOptional()
  members?: any[];
}

export class InviteFriendDto {
  @IsString()
  @IsNotEmpty()
  recipientId: string;

  @IsString()
  @IsNotEmpty()
  recipientName: string;

  @IsString()
  @IsOptional()
  recipientEmail?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;
}
