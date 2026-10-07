import { Injectable, BadRequestException } from '@nestjs/common';
import { ScanReceiptDto } from './ocr.dto';

@Injectable()
export class OcrService {
  async scanReceipt(dto: ScanReceiptDto) {
    try {
      const endpoint = process.env.MINDEE_API_ENDPOINT;
      if (!endpoint) {
        throw new Error('MINDEE_API_ENDPOINT chưa được cấu hình trong file .env');
      }
      const apiKey = process.env.MINDEE_API_KEY;
      const modelId = process.env.MINDEE_MODEL_ID;

      // 1. Gửi file vào hàng đợi (Enqueue) của Mindee v2
      const enqueueUrl = `https://api-v2.mindee.net/v2/products/extraction/enqueue`;
      const enqueuePayload = { 
        model_id: modelId,
        url: dto.imageUrl 
      };

      const response = await fetch(enqueueUrl, {
        method: 'POST',
        headers: {
          'Authorization': apiKey, // API v2 không cần prefix "Token "
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enqueuePayload),
      });

      const enqueueResult = await response.json();

      if (!response.ok || !enqueueResult.job || !enqueueResult.job.polling_url) {
        console.error('Mindee Enqueue Error:', enqueueResult);
        throw new Error(enqueueResult.detail || 'Lỗi từ API Mindee khi đẩy vào hàng đợi');
      }

      const pollingUrl = enqueueResult.job.polling_url;
      let finalInference = null;

      // 2. Polling chờ kết quả
      for (let i = 0; i < 15; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const pollRes = await fetch(pollingUrl, {
          headers: { 'Authorization': apiKey }
        });
        const pollData = await pollRes.json();

        if (pollData.inference && pollData.inference.result) {
          finalInference = pollData.inference;
          break;
        } else if (pollData.job && pollData.job.status === "Failed") {
          throw new Error('Mindee phân tích hóa đơn thất bại.');
        }
      }

      if (!finalInference) {
        throw new Error('Quá thời gian chờ Mindee phân tích.');
      }

      const fields = finalInference.result.fields;

      return {
        success: true,
        data: {
          amount: fields.total_amount?.value || 0,
          date: fields.date?.value || null,
          currency: fields.locale?.fields?.currency?.value || null,
          supplier: fields.supplier_name?.value || null,
        },
        message: 'Successfully parsed with Mindee OCR.',
      };
    } catch (error: any) {
      console.error('Mindee OCR Error:', error.message);
      throw new BadRequestException('Lỗi trong quá trình AI phân tích hóa đơn.');
    }
  }
}
