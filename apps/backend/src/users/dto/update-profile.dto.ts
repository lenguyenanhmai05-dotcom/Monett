import { IsString, IsOptional, IsUrl } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Avatar URL must be a valid URL' })
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  reminderTime?: string;

  @IsOptional()
  isPro?: boolean;
}
