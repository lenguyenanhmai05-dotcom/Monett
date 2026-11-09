import { IsNotEmpty, IsOptional, IsString, IsArray } from 'class-validator';

export class ChatAiDto {
  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  history?: Array<{ role: 'user' | 'model'; text: string }>;

  @IsOptional()
  @IsString()
  activeTab?: string;

  @IsOptional()
  @IsString()
  pageContext?: string;

  @IsOptional()
  userContext?: any;
}
