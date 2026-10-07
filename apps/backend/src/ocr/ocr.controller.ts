import { Controller, Post, Body } from '@nestjs/common';
import { OcrService } from './ocr.service';
import { ScanReceiptDto } from './ocr.dto';

@Controller('api/ocr')
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Post('scan')
  async scanReceipt(@Body() scanReceiptDto: ScanReceiptDto) {
    return this.ocrService.scanReceipt(scanReceiptDto);
  }
}
