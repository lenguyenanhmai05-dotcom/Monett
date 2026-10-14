import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsIn,
  IsBoolean,
} from 'class-validator';

export class CreateRecurringBillDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsNumber()
  @Min(1)
  @Max(31)
  dueDay: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  remindBeforeDays?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateRecurringBillDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  dueDay?: number;

  @IsOptional()
  @IsNumber()
  remindBeforeDays?: number;

  @IsOptional()
  @IsBoolean()
  isPaidThisMonth?: boolean;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateDebtDto {
  @IsIn(['lend', 'borrow'])
  type: 'lend' | 'borrow';

  @IsString()
  @IsNotEmpty()
  personName: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateDebtDto {
  @IsOptional()
  @IsIn(['lend', 'borrow'])
  type?: 'lend' | 'borrow';

  @IsOptional()
  @IsString()
  personName?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsBoolean()
  isSettled?: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}
