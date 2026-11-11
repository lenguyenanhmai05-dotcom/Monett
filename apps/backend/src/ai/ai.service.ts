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
1. NGUYÊN TẮC HỎI ĐÁP TOÀN DIỆN (CROSS-TAB): Người dùng có thể đứng ở BẤT KỲ màn hình nào (kể cả Trang chủ / Tổng quan, Báo cáo, Cá nhân,...) và hỏi về BẤT KỲ dữ liệu nào của ứng dụng (Sự kiện, Tích lũy & Heo đất, Sổ ghi nợ, Khoản định kỳ, Thu chi hôm nay, Ngân sách tháng).
2. Bạn PHẢI LUÔN tra cứu toàn bộ phần "DỮ LIỆU TÀI CHÍNH THỰC TẾ TRONG HỆ THỐNG CỦA NGƯỜI DÙNG" ở trên để trả lời trực tiếp, đầy đủ số liệu, tên sự kiện/mục tiêu/người nợ/khoản chi và số tiền (định dạng VND, ví dụ 150.000 đ).
3. TUYỆT ĐỐI KHÔNG bắt người dùng phải tự mở trang đó để xem, và KHÔNG trả lời chung chung khi dữ liệu đã có sẵn trong bối cảnh.
4. Giữ phong cách chú Ếch Monett 🐸💚 vui vẻ, lễ phép, dùng emoji sinh động và khích lệ người dùng.\n`;
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
    const pCtx = dto?.pageContext || '';

    // =========================================================================
    // TRA CỨU DỮ LIỆU THỰC TẾ XUYÊN SUỐT CÁC MÀN HÌNH (CROSS-TAB DATA LOOKUP)
    // Người dùng đứng ở bất kỳ trang nào cũng nhận được câu trả lời chính xác 100%!
    // =========================================================================

    // 1. SỰ KIỆN TÀI CHÍNH (EVENTS)
    const isAskingEvents =
      q.includes('sự kiện') ||
      q.includes('su kien') ||
      q.includes('event') ||
      q.includes('du lịch') ||
      q.includes('du lich') ||
      q.includes('đi chơi') ||
      q.includes('di choi') ||
      q.includes('chuyến đi') ||
      q.includes('chuyen di') ||
      q.includes('cắm trại') ||
      q.includes('cam trai') ||
      q.includes('tiệc') ||
      q.includes('tiec') ||
      q.includes('liên hoan') ||
      q.includes('đà nẵng') ||
      q.includes('da nang') ||
      q.includes('đà lạt') ||
      q.includes('da lat') ||
      q.includes('phú quốc') ||
      q.includes('phu quoc') ||
      dto?.activeTab === 'events';

    if (isAskingEvents && pCtx.includes('DANH SÁCH SỰ KIỆN TÀI CHÍNH')) {
      const matchBlock = pCtx.match(/📅 DANH SÁCH SỰ KIỆN TÀI CHÍNH \(([^)]+)\):([\s\S]*?)(?=\n\n[👛🔁📖⏰📊🧾]|$)/);
      if (matchBlock) {
        const eventsText = matchBlock[2].trim();
        // Kiểm tra xem người dùng có hỏi cụ thể sự kiện nào không (VD: Đà Nẵng, Đà Lạt, Phú Quốc, cắm trại...)
        const eventItems = eventsText.split(/(?=\s*\d+\.\s+Tên sự kiện:)/);
        const specificEvent = eventItems.find((item) => {
          const itemLow = item.toLowerCase();
          return (
            (q.includes('đà nẵng') || q.includes('da nang')) && itemLow.includes('đà nẵng') ||
            (q.includes('đà lạt') || q.includes('da lat')) && itemLow.includes('đà lạt') ||
            (q.includes('phú quốc') || q.includes('phu quoc')) && itemLow.includes('phú quốc') ||
            (q.includes('cắm trại') || q.includes('cam trai')) && itemLow.includes('cắm trại')
          );
        });

        if (specificEvent) {
          return {
            reply: `Chào bạn iu, Chú Ếch Monett 🐸💚 đã kiểm tra ngay sự kiện cho bạn rồi nè!\n\n${specificEvent.trim()}`,
            action: { label: '📅 Xem Chi Tiết Sự Kiện', tabKey: 'events' },
          };
        }

        return {
          reply: `Thông tin sự kiện tài chính của bạn nè! 🐸📅\n\n• **${matchBlock[1]}**\n\n${eventsText}`,
          action: { label: '📅 Đến Trang Sự Kiện', tabKey: 'events' },
        };
      }
    }

    // 2. TÍCH LŨY & HEO ĐẤT (SAVINGS)
    const isAskingSavings =
      q.includes('tích lũy') ||
      q.includes('tich luy') ||
      q.includes('tiết kiệm') ||
      q.includes('tiet kiem') ||
      q.includes('heo đất') ||
      q.includes('heo dat') ||
      q.includes('mục tiêu') ||
      q.includes('muc tieu') ||
      q.includes('nuôi heo') ||
      q.includes('quỹ dự phòng') ||
      q.includes('macbook') ||
      dto?.activeTab === 'savings' ||
      dto?.activeTab === 'budget';

    if (isAskingSavings && pCtx.includes('TÍCH LŨY & HEO ĐẤT')) {
      const match = pCtx.match(/👛 TÍCH LŨY & HEO ĐẤT \(([^)]+)\):([\s\S]*?)(?=\n\n[🔁📅📖⏰📊🧾]|$)/);
      if (match) {
        const isCount = q.includes('bao nhiêu') || q.includes('mấy') || q.includes('số lượng') || q.includes('danh sách');
        const header = isCount
          ? `Hiện tại bạn đang có **${match[1]}** nè! 🐸👛✨`
          : `Tiến độ nuôi heo đất của bạn nè! 🐸👛✨ (Đã đạt: **${match[1]}**)`;
        return {
          reply: `${header}\n\n${match[2].trim()}`,
          action: { label: '👛 Đến Trang Tích Lũy', tabKey: 'budget' },
        };
      }
    }

    // 3. ĐỊNH KỲ (RECURRING - CHI & THU ĐỊNH KỲ)
    const isAskingRecurring =
      q.includes('định kỳ') ||
      q.includes('dinh ky') ||
      q.includes('hóa đơn') ||
      q.includes('hoa don') ||
      q.includes('tiền phòng') ||
      q.includes('tiền trọ') ||
      q.includes('tiền nhà') ||
      q.includes('tiền điện') ||
      q.includes('tiền nước') ||
      q.includes('tiền mạng') ||
      q.includes('internet') ||
      q.includes('thu định kỳ') ||
      q.includes('chi định kỳ') ||
      q.includes('khoản định kỳ') ||
      q.includes('hàng tháng') ||
      dto?.activeTab === 'recurring';

    if (isAskingRecurring && pCtx.includes('KHOẢN ĐỊNH KỲ CỐ ĐỊNH')) {
      const match = pCtx.match(/🔁 KHOẢN ĐỊNH KỲ CỐ ĐỊNH:([\s\S]*?)(?=\n\n[👛📅📖⏰📊🧾]|$)/);
      if (match) {
        return {
          reply: `Báo cáo các khoản định kỳ của bạn nè! 🐸🔁\n${match[1].trim()}`,
          action: { label: '🔁 Đến Trang Định Kỳ', tabKey: 'recurring' },
        };
      }
    }

    // 4. SỔ GHI NỢ (DEBTS)
    const isAskingDebt =
      q.includes('nợ') ||
      q.includes('no') ||
      q.includes('mượn') ||
      q.includes('muon') ||
      q.includes('vay') ||
      q.includes('cho mượn') ||
      q.includes('cho vay') ||
      q.includes('ai nợ') ||
      q.includes('nợ ai') ||
      q.includes('đòi tiền') ||
      q.includes('sổ nợ') ||
      dto?.activeTab === 'debts' ||
      dto?.activeTab === 'debt';

    if (isAskingDebt && pCtx.includes('SỔ GHI NỢ')) {
      const match = pCtx.match(/📖 SỔ GHI NỢ:([\s\S]*?)(?=\n\n[👛📅🔁⏰📊🧾]|$)/);
      if (match) {
        return {
          reply: `Chi tiết Sổ Ghi Nợ của bạn nè! 🐸📖\n${match[1].trim()}`,
          action: { label: '📖 Đến Trang Sổ Ghi Nợ', tabKey: 'debts' },
        };
      }
    }

    // 5. NGÂN SÁCH THÁNG & CHI TIÊU HÔM NAY (BUDGET & TODAY)
    const isAskingBudget =
      q.includes('hôm nay') ||
      q.includes('hom nay') ||
      q.includes('chi tiêu hôm nay') ||
      q.includes('ngân sách') ||
      q.includes('ngan sach') ||
      q.includes('hạn mức') ||
      q.includes('còn lại') ||
      q.includes('lương');

    if (isAskingBudget && (pCtx.includes('NGÂN SÁCH THÁNG') || pCtx.includes('CHI TIÊU HÔM NAY'))) {
      const bMatch = pCtx.match(/📊 NGÂN SÁCH THÁNG[^:]*:([\s\S]*?)(?=\n\n[👛📅🔁📖⏰🧾]|$)/);
      const tMatch = pCtx.match(/🧾 CHI TIÊU HÔM NAY[^:]*:([\s\S]*?)(?=\n\n[👛📅🔁📖⏰📊]|$)/);
      let resText = 'Báo cáo ngân sách & chi tiêu của bạn nè! 🐸📊\n\n';
      if (bMatch) resText += `• **Ngân sách tháng:**\n${bMatch[1].trim()}\n\n`;
      if (tMatch) resText += `• **Hôm nay:**\n${tMatch[1].trim()}`;
      return {
        reply: resText.trim(),
        action: { label: '⊞ Đến Trang Tổng Quan', tabKey: 'home' },
      };
    }

    // 6. GHI CHÚ & NHẮC NHỞ (NOTES & REMINDERS)
    const isAskingReminders =
      q.includes('nhắc nhở') ||
      q.includes('nhac nho') ||
      q.includes('ghi chú') ||
      q.includes('ghi chu') ||
      q.includes('lịch hẹn') ||
      q.includes('sổ tay') ||
      dto?.activeTab === 'reminders';

    if (isAskingReminders && pCtx.includes('SỔ TAY GHI CHÚ')) {
      const match = pCtx.match(/⏰ SỔ TAY GHI CHÚ[^:]*:([\s\S]*?)(?=\n\n[👛📅🔁📖📊🧾]|$)/);
      if (match) {
        return {
          reply: `Danh sách ghi chú & nhắc nhở của bạn nè! 🐸⏰\n\n${match[1].trim()}`,
          action: { label: '⏰ Đến Trang Nhắc Nhở', tabKey: 'reminders' },
        };
      }
    }

    // =========================================================================
    // CÁC TRƯỜNG HỢP GIAO TIẾP XÃ GIAO / TƯ VẤN MẸO
    // =========================================================================

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
          'Oa chào bạn iu nha! 🐸💚 Mình là Ếch Monett – trợ lý tài chính thông minh của bạn đây! Bạn có thể hỏi mình bất kỳ dữ liệu nào về Tích lũy heo đất, Sự kiện đi chơi, Sổ ghi nợ, Hóa đơn định kỳ hay Chi tiêu hôm nay nhé! ✨🪙',
      };
    }

    // 2. Hỏi về danh tính chú Ếch
    if (q.includes('bạn là ai') || q.includes('ban la ai') || q.includes('tên gì') || q.includes('ten gi')) {
      return {
        reply:
          'Mình là chú Ếch Monett 🐸 – linh vật may mắn và trợ lý tài chính đồng hành cùng bạn trên mọi nẻo đường chi tiêu! Dù bạn đang ở bất kỳ trang nào, bạn đều có thể hỏi mình về Sự kiện, Tích lũy, Sổ nợ, Định kỳ hay Ngân sách nhé! 🪙✨',
      };
    }

    // 3. Mẹo tiết kiệm & Quản lý tài chính khi người dùng chủ động hỏi mẹo
    if (
      q.includes('mẹo') ||
      q.includes('kinh nghiệm') ||
      q.includes('lời khuyên') ||
      q.includes('cách quản lý') ||
      q.includes('cach quan ly') ||
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

    // 4. Khen ngợi / Cảm xúc
    if (q.includes('giỏi') || q.includes('dễ thương') || q.includes('cute') || q.includes('cảm ơn') || q.includes('cam on') || q.includes('thank')) {
      return {
        reply:
          'Hì hì, Ếch Monett cảm ơn bạn iu nhiều nha! 🐸💚 Được đồng hành cùng bạn quản lý chi tiêu là niềm vui lớn nhất của mình á! Chúc bạn một ngày tràn đầy năng lượng và ví luôn rủng rỉnh tiền nhé! ✨🎉',
      };
    }

    // 5. Phản hồi chung gợi mở
    return {
      reply:
        'Ếch Monett đã nghe rõ câu hỏi của bạn nè! 🐸💚\n\n' +
        'Dù bạn đang ở bất kỳ màn hình nào, bạn đều có thể hỏi mình trực tiếp về:\n' +
        '• **Sự kiện:** "Sự kiện đi du lịch ở Đà Nẵng đã chi tiêu bao nhiêu?", "Danh sách các sự kiện"\n' +
        '• **Tích lũy:** "Có bao nhiêu khoản tích lũy hiện tại?", "Tiến độ nuôi heo đất"\n' +
        '• **Định kỳ:** "Các khoản chi định kỳ tháng này", "Hóa đơn tiền phòng"\n' +
        '• **Sổ nợ:** "Ai đang nợ tiền tôi?", "Tôi đang vay nợ ai?"\n' +
        '• **Chi tiêu:** "Chi tiêu hôm nay là bao nhiêu?", "Ngân sách tháng này"\n\n' +
        'Hãy đặt câu hỏi để mình kiểm tra số liệu ngay cho bạn nhé! ✨',
    };
  }
}
