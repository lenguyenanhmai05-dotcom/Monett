import { Injectable, BadRequestException } from '@nestjs/common';
import { ScanReceiptDto } from './ocr.dto';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class OcrService {
  async scanReceipt(dto: ScanReceiptDto) {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY chưa được cấu hình trong file .env');
      }

      // Khởi tạo Gemini
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

      // Fetch ảnh từ Cloudinary về dạng ArrayBuffer
      const imageResp = await fetch(dto.imageUrl);
      if (!imageResp.ok) {
        throw new Error('Không thể tải ảnh từ url để phân tích');
      }
      const arrayBuffer = await imageResp.arrayBuffer();
      const base64Image = Buffer.from(arrayBuffer).toString('base64');
      const mimeType = imageResp.headers.get('content-type') || 'image/jpeg';

      const prompt = `
        Bạn là một hệ thống AI chuyên bóc tách thông tin hóa đơn.
        Hãy đọc bức ảnh hóa đơn (receipt) này và trả về ĐÚNG DUY NHẤT một object JSON, không được kèm bất kỳ text giải thích nào khác. Không dùng markdown code block, trả đúng raw JSON.
        Các trường dữ liệu cần trích xuất:
        - "amount": Tổng số tiền phải thanh toán (kiểu số, KHÔNG được chứa chữ hay dấu phẩy, ví dụ: 85000). Nếu không tìm thấy, để 0.
        - "supplier": Tên quán ăn, cửa hàng, siêu thị. (kiểu chuỗi). Ưu tiên tên in to rõ ràng nhất ở trên cùng.
        - "date": Ngày trên hóa đơn (chuỗi định dạng YYYY-MM-DD), nếu không có để null.
        - "currency": Ký hiệu tiền tệ, thường là "VND", nếu không rõ để null.
      `;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType
          }
        }
      ]);

      const responseText = result.response.text().trim().replace(/```json/g, '').replace(/```/g, '');
      const parsedData = JSON.parse(responseText);

      return {
        success: true,
        data: {
          amount: parsedData.amount || 0,
          date: parsedData.date || null,
          currency: parsedData.currency || null,
          supplier: parsedData.supplier || null,
        },
        message: 'Successfully parsed with Gemini OCR.',
      };
    } catch (error: any) {
      console.error('Gemini OCR Error:', error);
      throw new BadRequestException('Lỗi trong quá trình AI phân tích hóa đơn: ' + error.message);
    }
  }
}
