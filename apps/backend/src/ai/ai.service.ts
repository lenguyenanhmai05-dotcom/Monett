import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatAiDto } from './ai.dto';

@Injectable()
export class AiService {
  private readonly systemInstruction = `
Bạn là Chú Ếch Monett 🐸💚 – linh vật kiêm Trợ lý Tài chính & Quản lý Chi tiêu siêu cấp thông minh, vui vẻ và thân thiện của ứng dụng Monett.
Đặc điểm và phong cách của bạn:
- Xưng hô thân mật: "mình" hoặc "chú Ếch Monett", gọi người dùng là "bạn" hoặc "bạn iu".
- Giọng điệu: Vui tươi, tích cực, dí dỏm, khích lệ người dùng tiết kiệm, dùng các emoji sinh động (🐸, 💚, ✨, 🪙, 📊).
- Kiến thức: Bạn am hiểu sâu sắc về quản lý tài chính cá nhân (quy tắc 50/30/20, cách tiết kiệm khi lương thấp, xây dựng quỹ khẩn cấp 3-6 tháng, kiểm soát chi tiêu bốc đồng, chia tiền nhóm,...).
- Bạn hiểu rõ cấu trúc ứng dụng Monett gồm 7 tính năng chính:
  1. Tổng quan: Biểu đồ thu chi tổng thể, lịch chi tiêu hằng ngày, xem danh sách nhắc nhở.
  2. Tích lũy (Heo đất): Đặt mục tiêu mua sắm, tiết kiệm tiền và theo dõi tiến độ nạp tiền hằng ngày.
  3. Định kỳ: Quản lý các hóa đơn lặp lại hằng tháng như tiền phòng, điện nước, internet, đăng ký dịch vụ.
  4. Sổ ghi nợ: Theo dõi tiền cho người khác mượn và các khoản mình đang vay.
  5. Sự kiện: Lập kế hoạch chi tiêu nhóm, ăn uống, du lịch cùng bạn bè và chia tiền tiện lợi.
  6. Báo cáo: Biểu đồ cột, donut phân tích chi tiêu theo ngày, tuần, tháng, năm.
  7. Bảng tin: Chia sẻ khoảnh khắc chi tiêu với bạn bè, tương tác và nhắn tin riêng.
- Quy tắc trả lời:
  + Trả lời tự nhiên, thân thiện, súc tích (khoảng 2-4 đoạn ngắn), không quá dài dòng, dễ đọc trên điện thoại.
  + Nếu người dùng hỏi cách làm hoặc tính năng nào, hãy chỉ dẫn họ đến đúng trang tính năng đó trong Monett.
`;

  async chatWithFrog(dto: ChatAiDto) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);

        const pageNames: Record<string, string> = {
          home: 'Tổng quan (Trang chủ)',
          events: 'Sự kiện (Quản lý sự kiện, chuyến đi, ăn uống theo nhóm)',
          budget: 'Tích lũy & Heo đất (Mục tiêu tài chính, tiết kiệm mua sắm, quỹ khẩn cấp)',
          savings: 'Tích lũy & Heo đất (Mục tiêu tài chính, tiết kiệm mua sắm, quỹ khẩn cấp)',
          recurring: 'Định kỳ (Khoản chi định kỳ & Khoản thu định kỳ cố định)',
          debt: 'Sổ ghi nợ (Theo dõi người nợ tiền và các khoản vay nợ)',
          debts: 'Sổ ghi nợ (Theo dõi người nợ tiền và các khoản vay nợ)',
          reminders: 'Nhắc nhở & Ghi chú (Sổ tay ghi chú cá nhân, việc cần nhớ, lịch hẹn)',
          analytics: 'Báo cáo tài chính (Thống kê dòng tiền, phân tích thu chi)',
          transactions: 'Lịch sử giao dịch (Chi tiết các khoản thu chi)',
          feed: 'Bảng tin & Bạn bè (Cộng đồng chi tiêu)',
          messages: 'Tin nhắn trò chuyện',
          profile: 'Trang cá nhân & Cài đặt',
        };
        const activePageTitle = pageNames[dto.activeTab || ''] || dto.activeTab || 'Tổng quan';

        let dynamicInstruction = this.systemInstruction;
        dynamicInstruction += `\n\n=== THÔNG TIN BỐI CẢNH VÀ DỮ LIỆU HIỆN TẠI CỦA NGƯỜI DÙNG ===\n`;
        dynamicInstruction += `- Người dùng đang đứng ở màn hình: "${activePageTitle}" (Mã tab: "${dto.activeTab || 'home'}").\n`;

        if (dto.pageContext && dto.pageContext.trim()) {
          dynamicInstruction += `\n--- DỮ LIỆU TÀI CHÍNH THỰC TẾ TRONG HỆ THỐNG CỦA NGƯỜI DÙNG ---\n${dto.pageContext.trim()}\n--------------------------------------------------------------\n`;
          dynamicInstruction += `\nQUY TẮC BẮT BUỘC KHI TRẢ LỜI CÂU HỎI VỀ DỮ LIỆU:
1. Khi người dùng hỏi về màn hình hiện tại (ví dụ: "ở trang này có gì", "tôi có sự kiện nào", "chi tiết các khoản nợ", "tổng chi tiêu", "tiến độ mục tiêu", "các khoản định kỳ"...):
   -> Bạn PHẢI sử dụng trực tiếp các số liệu, tên sự kiện, tên mục tiêu, tên người nợ, số tiền trong VND, ngày tháng từ "DỮ LIỆU TÀI CHÍNH THỰC TẾ" ở trên để trả lời cụ thể, chính xác từng chi tiết cho người dùng!
2. Tuyệt đối KHÔNG trả lời chung chung hoặc bảo người dùng "hãy tự vào trang để xem" khi thông tin đã có sẵn trong dữ liệu trên.
3. Nếu người dùng hỏi một trang khác với trang đang đứng (ví dụ đang ở Sự kiện nhưng hỏi về Sổ nợ hay Heo đất), nếu dữ liệu trên có thông tin thì trả lời ngay và có thể gợi ý chuyển sang trang đó.
4. Giữ phong cách chú Ếch Monett 🐸💚 vui vẻ, lễ phép, dùng emoji sinh động và định dạng số tiền rõ ràng (VD: 1.000.000 đ).\n`;
        }

        const rawModel = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').replace(/['"]/g, '').trim();
        const modelName = rawModel === 'gemini-1.5-flash' ? 'gemini-2.5-flash' : rawModel || 'gemini-2.5-flash';

        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: dynamicInstruction,
        });

        // Chuẩn bị chat history nếu có
        let historyFormatted = [];
        if (dto.history && Array.isArray(dto.history)) {
          historyFormatted = dto.history.slice(-8).map((h) => ({
            role: h.role === 'model' ? 'model' : 'user',
            parts: [{ text: h.text }],
          }));
        }

        const chat = model.startChat({
          history: historyFormatted,
        });

        const result = await chat.sendMessage(dto.message);
        const responseText = result.response.text();

        return {
          success: true,
          isAi: true,
          reply: responseText,
        };
      } catch (err: any) {
        console.warn('Gemini chat warning:', err?.message || err);
      }
    }

    // Nếu chưa có API Key hoặc Gemini gặp lỗi mạng, sử dụng bộ xử lý thông minh nội bộ
    const fallbackReply = this.generateSmartFallbackReply(dto.message, dto);
    return {
      success: true,
      isAi: false,
      reply: fallbackReply.reply,
      action: fallbackReply.action,
    };
  }

  private generateSmartFallbackReply(
    query: string,
    dto?: ChatAiDto
  ): { reply: string; action?: { label: string; tabKey: string } } {
    const q = query.toLowerCase().trim();

    // Kiểm tra nếu trong pageContext có dữ liệu thực tế phù hợp với câu hỏi
    if (dto?.pageContext && dto.pageContext.trim()) {
      const pCtx = dto.pageContext;

      // 1. Tích lũy & Heo đất
      if (
        q.includes('tích lũy') ||
        q.includes('tich luy') ||
        q.includes('heo đất') ||
        q.includes('mục tiêu') ||
        dto.activeTab === 'savings' ||
        dto.activeTab === 'budget'
      ) {
        if (pCtx.includes('TÍCH LŨY & HEO ĐẤT')) {
          const match = pCtx.match(/👛 TÍCH LŨY & HEO ĐẤT \(([^)]+)\):([\s\S]*?)(?=\n\n[🔁📅📖⏰📊🧾]|$)/);
          if (match) {
            return {
              reply: `Tiến độ nuôi heo đất của bạn nè! 🐸👛✨\n\n• Hiện tại: **${match[1]}**\n\n${match[2].trim()}`,
              action: { label: '👛 Đến Trang Tích Lũy', tabKey: 'budget' },
            };
          }
        }
      }

      // 2. Sự kiện
      if (
        q.includes('sự kiện') ||
        q.includes('su kien') ||
        q.includes('event') ||
        q.includes('du lịch') ||
        q.includes('đi chơi') ||
        dto.activeTab === 'events'
      ) {
        if (pCtx.includes('DANH SÁCH SỰ KIỆN TÀI CHÍNH')) {
          const match = pCtx.match(/📅 DANH SÁCH SỰ KIỆN TÀI CHÍNH \(([^)]+)\):([\s\S]*?)(?=\n\n[👛🔁📖⏰📊🧾]|$)/);
          if (match) {
            return {
              reply: `Thông tin sự kiện tài chính của bạn nè! 🐸📅\n\n• **${match[1]}**\n\n${match[2].trim()}`,
              action: { label: '📅 Đến Trang Sự Kiện', tabKey: 'events' },
            };
          }
        }
      }

      // 3. Định kỳ
      if (
        q.includes('định kỳ') ||
        q.includes('dinh ky') ||
        q.includes('hóa đơn') ||
        q.includes('tiền phòng') ||
        q.includes('tiền trọ') ||
        dto.activeTab === 'recurring'
      ) {
        if (pCtx.includes('KHOẢN ĐỊNH KỲ CỐ ĐỊNH')) {
          const match = pCtx.match(/🔁 KHOẢN ĐỊNH KỲ CỐ ĐỊNH:([\s\S]*?)(?=\n\n[👛📅📖⏰📊🧾]|$)/);
          if (match) {
            return {
              reply: `Báo cáo các khoản định kỳ của bạn nè! 🐸🔁\n${match[1].trim()}`,
              action: { label: '🔁 Đến Trang Định Kỳ', tabKey: 'recurring' },
            };
          }
        }
      }

      // 4. Sổ ghi nợ
      if (
        q.includes('nợ') ||
        q.includes('cho mượn') ||
        q.includes('vay') ||
        q.includes('ai nợ') ||
        dto.activeTab === 'debts' ||
        dto.activeTab === 'debt'
      ) {
        if (pCtx.includes('SỔ GHI NỢ')) {
          const match = pCtx.match(/📖 SỔ GHI NỢ:([\s\S]*?)(?=\n\n[👛📅🔁⏰📊🧾]|$)/);
          if (match) {
            return {
              reply: `Chi tiết sổ ghi nợ của bạn nè! 🐸📖\n${match[1].trim()}`,
              action: { label: '📖 Đến Trang Sổ Ghi Nợ', tabKey: 'debts' },
            };
          }
        }
      }
    }

    // 1. Chào hỏi thân mật
    if (
      q === 'hello' ||
      q === 'hi' ||
      q.includes('chào') ||
      q.includes('chao') ||
      q.includes('alo') ||
      q.includes('ê ếch') ||
      q.includes('ê ech') ||
      q.includes('bạn ơi') ||
      q.includes('ban oi')
    ) {
      return {
        reply:
          'Oa chào bạn iu nha! 🐸💚 Mình là Ếch Monett – trợ lý tài chính thông minh của bạn đây! Hôm nay ví tiền của bạn có "khỏe" không nè? Bạn muốn ghi chép chi tiêu, kiểm tra mục tiêu tiết kiệm hay cần mình tư vấn mẹo gì cứ bảo mình nhé! ✨',
      };
    }

    // 2. Hỏi về danh tính chú Ếch
    if (q.includes('bạn là ai') || q.includes('ban la ai') || q.includes('tên gì') || q.includes('ten gi')) {
      return {
        reply:
          'Mình là chú Ếch Monett 🐸 – linh vật may mắn và trợ lý tài chính đồng hành cùng bạn trên mọi nẻo đường chi tiêu! Mình có thể giúp bạn kiểm soát dòng tiền, nhắc nhở trả nợ và cùng bạn nuôi heo đất siêu to khổng lồ luôn! 🪙✨',
      };
    }

    // 3. Mẹo tiết kiệm & Quản lý tài chính
    if (
      q.includes('tiết kiệm') ||
      q.includes('tiet kiem') ||
      q.includes('cách quản lý') ||
      q.includes('cach quan ly') ||
      q.includes('lương') ||
      q.includes('50/30/20') ||
      q.includes('het tien') ||
      q.includes('hết tiền')
    ) {
      return {
        reply:
          'Bí kíp tiết kiệm vàng từ Ếch Monett nè bạn ơi 🐸💡:\n\n' +
          '1️⃣ **Quy tắc 50/30/20:** Dành 50% cho nhu cầu thiết yếu (tiền ăn, trọ), 30% cho sở thích cá nhân, và 20% cất ngay vào heo đất khi vừa nhận lương!\n' +
          '2️⃣ **Quy tắc 24h:** Trước khi bấm mua món đồ đắt tiền không nằm trong kế hoạch, hãy hoãn lại 24 tiếng. 80% bạn sẽ thấy mình không thật sự cần nó!\n' +
          '3️⃣ **Nuôi heo đất cùng Monett:** Tạo ngay một mục tiêu trong tab Tích Lũy để thấy tiền của mình tăng lên mỗi ngày nhé!',
        action: { label: '👛 Đến Trang Tích Lũy', tabKey: 'budget' },
      };
    }

    // 4. Mẹo ăn uống / Đi chơi tiết kiệm
    if (q.includes('ăn gì') || q.includes('an gi') || q.includes('du lịch') || q.includes('di choi') || q.includes('đi chơi')) {
      return {
        reply:
          'Đi ăn hay đi chơi cùng hội bạn thân thì vui hết sảy, nhưng nhớ dùng tính năng **Sự Kiện** của Monett để gom hóa đơn và chia tiền minh bạch, tránh cảnh "ngại đòi tiền" nha bạn ơi! 🐸🍕',
        action: { label: '📅 Đến Trang Sự Kiện', tabKey: 'events' },
      };
    }

    // 5. Quên đóng tiền / Hóa đơn
    if (q.includes('quên') || q.includes('hoa don') || q.includes('hóa đơn') || q.includes('tiền điện') || q.includes('tiền trọ')) {
      return {
        reply:
          'Đừng để bị cắt điện hay chủ nhà nhắc nhở nè! 🐸 Bạn hãy vào tab **Định Kỳ** để lên lịch sẵn các hóa đơn cố định, Monett sẽ chủ động nhắc bạn đúng hạn!',
        action: { label: '🔁 Đến Trang Định Kỳ', tabKey: 'recurring' },
      };
    }

    // 6. Cho mượn tiền / Đòi nợ
    if (q.includes('đòi nợ') || q.includes('doi no') || q.includes('cho mượn') || q.includes('cho muon') || q.includes('ai nợ')) {
      return {
        reply:
          'Tiền bạc phân minh, tình cảm bền lâu! 🐸📖 Mọi khoản cho bạn bè mượn hay tiền bạn đang vay hãy ghi ngay vào **Sổ Ghi Nợ** để theo dõi số tiền còn lại và đánh dấu khi thanh toán xong nhé!',
        action: { label: '📖 Đến Trang Sổ Ghi Nợ', tabKey: 'debts' },
      };
    }

    // 7. Nhắc việc / Ghi chú
    if (q.includes('nhắc nhở') || q.includes('nhac nho') || q.includes('ghi chú') || q.includes('ghi chu') || q.includes('lịch hẹn')) {
      return {
        reply:
          'Trang **Nhắc Nhở & Ghi Chú** mới được nâng cấp cực kỳ xịn sò đó bạn! Bạn có thể đặt chuông báo hẹn giờ hoặc viết sổ tay cá nhân lưu lại mọi ý tưởng hay ho nè 🐸📝',
        action: { label: '⏰ Đến Trang Nhắc Nhở', tabKey: 'reminders' },
      };
    }

    // 8. Khen ngợi / Cảm xúc
    if (q.includes('giỏi') || q.includes('dễ thương') || q.includes('cute') || q.includes('cảm ơn') || q.includes('cam on') || q.includes('thank')) {
      return {
        reply:
          'Hì hì, Ếch Monett cảm ơn bạn iu nhiều nha! 🐸💚 Được đồng hành cùng bạn quản lý chi tiêu là niềm vui lớn nhất của mình á! Chúc bạn một ngày tràn đầy năng lượng và ví luôn rủng rỉnh tiền nhé! ✨🎉',
      };
    }

    // 9. Phản hồi chung gợi mở
    return {
      reply:
        'Ếch Monett đã nghe rõ câu hỏi của bạn nè! 🐸💚\n\n' +
        'Bạn có thể hỏi mình về:\n' +
        '• Mẹo tiết kiệm & phân bổ chi tiêu (quy tắc 50/30/20)\n' +
        '• Hướng dẫn sử dụng các tính năng trong Monett (Tích lũy, Sổ nợ, Định kỳ, Sự kiện)\n' +
        '• Hoặc bấm vào các lối tắt bên dưới để mình dẫn đường trực tiếp nhé! ✨',
    };
  }
}
