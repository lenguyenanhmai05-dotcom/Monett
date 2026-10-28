import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ScanReceiptDto {
  @IsNotEmpty({ message: 'imageUrl must not be empty' })
  @IsString({ message: 'imageUrl must be a valid string' })
  imageUrl: string;

  @IsOptional()
  @IsString()
  apiKey?: string;
}
