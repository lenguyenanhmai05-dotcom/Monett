import { IsUrl, IsNotEmpty } from 'class-validator';

export class ScanReceiptDto {
  @IsNotEmpty({ message: 'imageUrl must not be empty' })
  @IsUrl({}, { message: 'imageUrl must be a valid URL' })
  imageUrl: string;
}
