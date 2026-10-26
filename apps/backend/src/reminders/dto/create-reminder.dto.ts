import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator';

export class CreateReminderDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  date?: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  time?: string; // HH:mm

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(120)
  remindBeforeMinutes?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateReminderDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  time?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(120)
  remindBeforeMinutes?: number;

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;

  @IsOptional()
  @IsBoolean()
  isDismissed?: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}
