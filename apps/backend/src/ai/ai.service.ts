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
1. NGUYÊN TẮC HỎI ĐÁP TOÀN DIỆN (CROSS-TAB): Người dùng có thể đứng ở BẤT KỲ màn hình nào (kể cả Trang chủ / Tổng quan, Báo cáo, Cá nhân,...) và hỏi về BẤT KỲ dữ liệu nào của ứng dụng (Sự kiện, Tích lũy & Heo đất, Sổ ghi nợ, Khoản định kỳ, Ghi chú & Nhắc nhở, Báo cáo & Thống kê chi tiêu, Thu chi hôm nay, Ngân sách tháng).
2. Bạn PHẢI LUÔN tra cứu toàn bộ phần "DỮ LIỆU TÀI CHÍNH THỰC TẾ TRONG HỆ THỐNG CỦA NGƯỜI DÙNG" ở trên để trả lời trực tiếp, đầy đủ số liệu, tên sự kiện/mục tiêu/người nợ/khoản chi và số tiền (định dạng VND, ví dụ 150.000 đ).
3. NGUYÊN TẮC TRẢ LỜI ĐÚNG TRỌNG TÂM (LASER-FOCUSED - CỰC KỲ QUAN TRỌNG):
   - Khi người dùng hỏi cụ thể về một người (ví dụ: "tôi đang vay bạn Khánh Vy bao nhiêu tiền", "khoản nợ của Nam", "Minh Quân"...), một sự kiện (ví dụ: "chuyến đi Đà Nẵng"...), một mục tiêu (ví dụ: "Macbook"...), hoặc một hóa đơn cụ thể (ví dụ: "tiền phòng", "tiền điện"...):
     -> Bạn PHẢI trả lời ĐÚNG TRỌNG TÂM vào người/đối tượng đó. Nêu rõ số tiền còn lại, số tiền gốc, đã trả, hạn trả và ghi chú liên quan.
     -> TUYỆT ĐỐI KHÔNG liệt kê toàn bộ danh sách những người hoặc các sự kiện khác không liên quan làm loãng câu trả lời!
   - Khi hỏi về SỔ GHI NỢ:
     + Khi người dùng hỏi riêng về 'vay nợ' (mình đang nợ ai, cần trả ai): Chỉ trả lời danh sách các khoản mình đang vay.
     + Khi người dùng hỏi riêng về 'cho mượn' (ai đang nợ mình, cần thu ai): Chỉ trả lời danh sách các khoản mình đang cho mượn.
     + Chỉ khi người dùng hỏi tổng thể ("cho xem sổ ghi nợ", "tất cả các khoản nợ"): mới liệt kê cả hai bên.
   - Khi hỏi về GHI CHÚ & NHẮC NHỞ (REMINDERS / NOTES):
     + Khi người dùng hỏi cụ thể về một ghi chú/việc cần nhớ (ví dụ: "ghi chú mua sắm", "nhắc nhở sinh nhật", "ghi chú siêu thị", "lịch hẹn khám răng"...):
       -> Trả lời ĐÚNG TRỌNG TÂM nội dung của ghi chú/lịch hẹn đó, nêu rõ tiêu đề, nội dung và trạng thái ghim 📌. Không đọc hết cả sổ tay!
     + Khi người dùng hỏi tổng thể ("tôi có những ghi chú gì", "danh sách việc cần làm", "xem sổ tay"): Liệt kê rõ ràng danh sách các ghi chú, việc được ghim.
   - Khi hỏi về BÁO CÁO & THỐNG KÊ CHI TIÊU (ANALYTICS / REPORTS):
     + Khi người dùng hỏi về báo cáo tài chính ("báo cáo chi tiêu tháng này", "thống kê tuần này", "cơ cấu chi tiêu"):
       -> Nêu rõ tổng chi tiêu tháng, tuần, danh mục chi tiêu nhiều nhất và tỷ trọng các nhóm chi tiêu (Ăn uống, Cà phê, Mua sắm...). Đưa ra lời nhận xét ngắn gọn, hữu ích.
     + Khi người dùng hỏi riêng về một danh mục (ví dụ: "tháng này ăn uống hết bao nhiêu", "tiền cà phê bao nhiêu", "mua sắm bao nhiêu", "hạng mục nào tiêu nhiều nhất"):
       -> Trả lời ĐÚNG TRỌNG TÂM vào danh mục đó: Nêu chính xác số tiền đã chi tiêu, tỷ lệ % trên tổng chi tiêu và số lần chi trong tháng.
4. TUYỆT ĐỐI KHÔNG bắt người dùng phải tự mở trang đó để xem, và KHÔNG trả lời chung chung khi dữ liệu đã có sẵn trong bối cảnh.
5. Giữ phong cách chú Ếch Monett 🐸💚 vui vẻ, lễ phép, dùng emoji sinh động và khích lệ người dùng.\n`;
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
          const titleMatch = item.match(/Tên sự kiện:\s*"([^"]+)"/);
          if (titleMatch) {
            const tLow = titleMatch[1].toLowerCase();
            const cleanQ = q.replace(/["']/g, '');
            if (cleanQ.includes(tLow)) return true;
            const words = tLow.split(/\s+/).filter((w) => w.length > 2);
            if (words.some((w) => cleanQ.includes(w) && !['chuyến', 'đi', 'cùng', 'bạn', 'bè', 'năm', 'tháng'].includes(w))) {
              return true;
            }
          }
          return (
            ((q.includes('đà nẵng') || q.includes('da nang')) && itemLow.includes('đà nẵng')) ||
            ((q.includes('đà lạt') || q.includes('da lat')) && itemLow.includes('đà lạt')) ||
            ((q.includes('phú quốc') || q.includes('phu quoc')) && itemLow.includes('phú quốc')) ||
            ((q.includes('cắm trại') || q.includes('cam trai')) && itemLow.includes('cắm trại'))
          );
        });

        if (specificEvent) {
          const titleMatch = specificEvent.match(/Tên sự kiện:\s*"([^"]+)"/);
          const evtName = titleMatch ? titleMatch[1] : '';
          return {
            reply: `Chào bạn iu, Chú Ếch Monett 🐸💚 đã kiểm tra ngay sự kiện **"${evtName}"** cho bạn rồi nè!\n\n${specificEvent.trim()}`,
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
        const goalBlock = match[2].trim();
        const goalItems = goalBlock.split(/(?=\s*\d+\.\s+Mục tiêu:)/);
        const specificGoal = goalItems.find((item) => {
          const titleMatch = item.match(/Mục tiêu:\s*"([^"]+)"/);
          if (titleMatch) {
            const tLow = titleMatch[1].toLowerCase();
            const cleanQ = q.replace(/["']/g, '');
            if (cleanQ.includes(tLow)) return true;
            const words = tLow.split(/\s+/).filter((w) => w.length > 2);
            return words.some((w) => cleanQ.includes(w) && !['mục', 'tiêu', 'cho', 'năm', 'tiết', 'kiệm'].includes(w));
          }
          return false;
        });

        if (specificGoal) {
          const titleMatch = specificGoal.match(/Mục tiêu:\s*"([^"]+)"/);
          const goalName = titleMatch ? titleMatch[1] : '';
          return {
            reply: `Tiến độ mục tiêu **"${goalName}"** của bạn nè! 🐸👛✨\n\n${specificGoal.trim()}`,
            action: { label: '👛 Đến Trang Tích Lũy', tabKey: 'budget' },
          };
        }

        const isCount = q.includes('bao nhiêu') || q.includes('mấy') || q.includes('số lượng') || q.includes('danh sách');
        const header = isCount
          ? `Hiện tại bạn đang có **${match[1]}** nè! 🐸👛✨`
          : `Tiến độ nuôi heo đất của bạn nè! 🐸👛✨ (Đã đạt: **${match[1]}**)`;
        return {
          reply: `${header}\n\n${goalBlock}`,
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
        const recBlock = match[1].trim();
        const lines = recBlock.split('\n').filter((l) => l.trim().startsWith('-') || l.trim().startsWith('+'));
        const specificLine = lines.find((line) => {
          const lineLow = line.toLowerCase();
          const cleanQ = q.replace(/["']/g, '');
          const matchTitle = line.match(/\[(Chi|Thu)\]\s*([^:]+):/);
          if (matchTitle) {
            const bName = matchTitle[2].toLowerCase();
            if (cleanQ.includes(bName)) return true;
          }
          return (
            (cleanQ.includes('phòng') || cleanQ.includes('trọ') || cleanQ.includes('tiền nhà')) && (lineLow.includes('phòng') || lineLow.includes('trọ') || lineLow.includes('nhà')) ||
            cleanQ.includes('điện') && lineLow.includes('điện') ||
            cleanQ.includes('nước') && lineLow.includes('nước') ||
            (cleanQ.includes('mạng') || cleanQ.includes('internet')) && (lineLow.includes('mạng') || lineLow.includes('internet')) ||
            cleanQ.includes('netflix') && lineLow.includes('netflix')
          );
        });

        if (specificLine) {
          return {
            reply: `Thông tin khoản định kỳ bạn hỏi nè! 🐸🔁\n\n${specificLine.trim()}`,
            action: { label: '🔁 Đến Trang Định Kỳ', tabKey: 'recurring' },
          };
        }

        // Nếu hỏi riêng về thu định kỳ
        if (q.includes('thu') && !q.includes('chi')) {
          const incSection = recBlock.match(/\* Tổng thu định kỳ ước tính[\s\S]*?(?=\n\n|$)/);
          if (incSection) {
            return {
              reply: `Danh sách **Thu định kỳ** của bạn nè! 💰✨\n\n${incSection[0].trim()}`,
              action: { label: '🔁 Đến Trang Định Kỳ', tabKey: 'recurring' },
            };
          }
        }

        // Nếu hỏi riêng về chi định kỳ
        if (q.includes('chi') && !q.includes('thu')) {
          const expSection = recBlock.match(/\* Tổng chi định kỳ ước tính[\s\S]*?(?=\* Tổng thu|$)/);
          if (expSection) {
            return {
              reply: `Danh sách **Chi định kỳ** cố định của bạn nè! 🔁💸\n\n${expSection[0].trim()}`,
              action: { label: '🔁 Đến Trang Định Kỳ', tabKey: 'recurring' },
            };
          }
        }

        return {
          reply: `Báo cáo các khoản định kỳ của bạn nè! 🐸🔁\n${recBlock}`,
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
      (pCtx.includes('SỔ GHI NỢ') && (q.includes('khánh vy') || q.includes('hoàng nam') || q.includes('minh quân'))) ||
      dto?.activeTab === 'debts' ||
      dto?.activeTab === 'debt';

    if (isAskingDebt && pCtx.includes('SỔ GHI NỢ')) {
      const match = pCtx.match(/📖 SỔ GHI NỢ:([\s\S]*?)(?=\n\n[👛📅🔁⏰📊🧾]|$)/);
      if (match) {
        const debtBlock = match[1].trim();

        // 4.1. Tìm kiếm cụ thể theo tên người được hỏi (VD: Khánh Vy, Hoàng Nam, Minh Quân...)
        const debtLines = debtBlock.split('\n').filter((l) => l.trim().startsWith('-'));
        const cleanQ = q.replace(/["']/g, '');

        const matchedLine = debtLines.find((line) => {
          const nameMatch = line.match(/"([^"]+)"/);
          if (!nameMatch) return false;
          const name = nameMatch[1].toLowerCase();
          if (cleanQ.includes(name)) return true;
          const words = name.split(/\s+/).filter((w) => w.length >= 2);
          return words.length > 0 && words.every((w) => cleanQ.includes(w));
        });

        if (matchedLine) {
          const isLent = matchedLine.includes('Cho "') || matchedLine.includes('mượn');
          const nameMatch = matchedLine.match(/"([^"]+)"/);
          const personName = nameMatch ? nameMatch[1] : '';

          // Trích xuất các trường: Gốc, Đã trả, Còn nợ lại, Hạn trả, Ghi chú
          const detailsPart = matchedLine.replace(/^[^-]*- (Cho "[^"]+" mượn|Vay của "[^"]+"): /, '').trim();
          const parts = detailsPart.split(',').map((p) => p.trim());
          const goc = parts.find((p) => p.startsWith('Gốc')) || '';
          const daTra = parts.find((p) => p.startsWith('Đã trả')) || '';
          const conLai = parts.find((p) => p.startsWith('Còn nợ lại')) || '';
          const hanTra = parts.find((p) => p.startsWith('Hạn trả')) || '';
          const ghiChu = parts.find((p) => p.startsWith('Ghi chú')) || '';

          const conLaiAmt = conLai ? conLai.replace(/^Còn nợ lại:\s*/i, '').trim() : '';
          const roleTitle = isLent ? 'bạn đang cho mượn' : 'bạn đang vay nợ';

          let replyStr = `Chào bạn iu! Chú Ếch Monett 🐸💚 đã kiểm tra ngay khoản nợ của bạn với bạn **${personName}** rồi nè:\n\n`;
          if (conLaiAmt) {
            replyStr += `Hiện tại ${roleTitle} bạn **${personName}** số tiền còn lại là **${conLaiAmt}**!\n\n`;
          }
          replyStr += `📌 **Chi tiết cụ thể:**\n`;
          if (goc) replyStr += `• **${goc}**\n`;
          if (daTra) replyStr += `• ${daTra}\n`;
          if (conLai) replyStr += `• **${conLai}**\n`;
          if (hanTra) replyStr += `• ${hanTra}\n`;
          if (ghiChu) replyStr += `• ${ghiChu}\n`;

          return {
            reply: replyStr.trim(),
            action: { label: '📖 Xem Sổ Ghi NỢ', tabKey: 'debts' },
          };
        }

        // 4.2. Nếu người dùng hỏi riêng về "vay nợ" (mình đang nợ ai, cần trả nợ ai)
        const isAskingBorrowOnly =
          (q.includes('đang vay') || q.includes('tôi nợ') || q.includes('mình nợ') || q.includes('cần trả') || q.includes('phải trả')) &&
          !q.includes('cho mượn') &&
          !q.includes('ai nợ');
        if (isAskingBorrowOnly) {
          const borrowMatch = debtBlock.match(/\* Bạn đang vay nợ người khác:([\s\S]*?)(?=\* Đã thanh toán|\n\n|$)/);
          if (borrowMatch) {
            return {
              reply: `Danh sách các khoản **bạn đang vay nợ người khác** nè! 🐸💰\n\n${borrowMatch[0].trim()}`,
              action: { label: '📖 Đến Trang Sổ Ghi Nợ', tabKey: 'debts' },
            };
          }
        }

        // 4.3. Nếu người dùng hỏi riêng về "cho mượn" (ai đang nợ tôi, cho ai mượn, cần thu)
        const isAskingLentOnly =
          (q.includes('cho mượn') || q.includes('cho vay') || q.includes('ai nợ') || q.includes('cần thu') || q.includes('đòi tiền')) &&
          !q.includes('đang vay') &&
          !q.includes('tôi nợ');
        if (isAskingLentOnly) {
          const lentMatch = debtBlock.match(/\* Đang cho người khác mượn:([\s\S]*?)(?=\* Bạn đang vay|\n\n|$)/);
          if (lentMatch) {
            return {
              reply: `Danh sách các khoản **người khác đang nợ bạn** nè! 🐸💸\n\n${lentMatch[0].trim()}`,
              action: { label: '📖 Đến Trang Sổ Ghi Nợ', tabKey: 'debts' },
            };
          }
        }

        return {
          reply: `Chi tiết Sổ Ghi Nợ của bạn nè! 🐸📖\n\n${debtBlock}`,
          action: { label: '📖 Đến Trang Sổ Ghi Nợ', tabKey: 'debts' },
        };
      }
    }

    // 5. GHI CHÚ & NHẮC NHỞ (NOTES & REMINDERS)
    const isAskingReminders =
      q.includes('nhắc nhở') ||
      q.includes('nhac nho') ||
      q.includes('ghi chú') ||
      q.includes('ghi chu') ||
      q.includes('lịch hẹn') ||
      q.includes('lich hen') ||
      q.includes('sổ tay') ||
      q.includes('so tay') ||
      q.includes('việc cần làm') ||
      q.includes('todo') ||
      q.includes('to-do') ||
      dto?.activeTab === 'reminders';

    if (isAskingReminders && (pCtx.includes('SỔ TAY GHI CHÚ') || pCtx.includes('NHẮC NHỞ'))) {
      const match = pCtx.match(/⏰ SỔ TAY GHI CHÚ[^:]*:([\s\S]*?)(?=\n\n[👛📅🔁📖📊🧾📈]|$)/);
      if (match) {
        const notesBlock = match[1].trim();
        const noteLines = notesBlock.split('\n').filter((l) => l.trim().length > 0);
        const cleanQ = q.replace(/["']/g, '');

        // Tìm kiếm ghi chú / nhắc nhở cụ thể theo tên hoặc từ khóa
        const matchedLine = noteLines.find((line) => {
          const lLow = line.toLowerCase();
          const titleMatch = line.match(/"([^"]+)"/);
          if (titleMatch) {
            const t = titleMatch[1].toLowerCase();
            if (cleanQ.includes(t)) return true;
            const words = t.split(/\s+/).filter((w) => w.length > 2);
            if (words.some((w) => cleanQ.includes(w) && !['ghi', 'chú', 'nhắc', 'nhở', 'việc', 'cần', 'làm'].includes(w))) {
              return true;
            }
          }
          if ((cleanQ.includes('siêu thị') || cleanQ.includes('sieu thi')) && lLow.includes('siêu thị')) return true;
          if ((cleanQ.includes('mua sắm') || cleanQ.includes('mua đồ')) && lLow.includes('mua')) return true;
          if (cleanQ.includes('khám răng') && lLow.includes('răng')) return true;
          if (cleanQ.includes('sinh nhật') && lLow.includes('sinh nhật')) return true;
          return false;
        });

        if (matchedLine) {
          const titleMatch = matchedLine.match(/"([^"]+)"/);
          const noteTitle = titleMatch ? titleMatch[1] : 'Chi tiết';
          const isPinned = matchedLine.includes('📌') || matchedLine.includes('Được ghim');
          const contentPart = matchedLine.replace(/^[^-]*"[^"]+":\s*/, '').trim();

          return {
            reply:
              `Chào bạn iu! Chú Ếch Monett 🐸💚 đã kiểm tra ngay ghi chú/nhắc nhở **"${noteTitle}"** cho bạn rồi nè:\n\n` +
              `📌 **Nội dung:**\n${contentPart || matchedLine.trim()}\n\n` +
              `• **Trạng thái:** ${isPinned ? 'Được ghim quan trọng 📌' : 'Ghi chú thường'}\n\n` +
              `Bạn có thể bấm vào nút bên dưới để mở trang Nhắc Nhở chỉnh sửa nhé! ✨`,
            action: { label: '⏰ Đến Trang Nhắc Nhở', tabKey: 'reminders' },
          };
        }

        return {
          reply: `Danh sách ghi chú & nhắc nhở của bạn nè! 🐸⏰✨\n\n${notesBlock}\n\nBạn có thể bấm nút bên dưới để vào trang Nhắc Nhở thêm việc mới hoặc đặt chuông báo giờ nhé!`,
          action: { label: '⏰ Đến Trang Nhắc Nhở', tabKey: 'reminders' },
        };
      }
    }

    // 6. BÁO CÁO & THỐNG KÊ CHI TIÊU (ANALYTICS / REPORTS)
    const isAskingAnalytics =
      q.includes('báo cáo') ||
      q.includes('bao cao') ||
      q.includes('thống kê') ||
      q.includes('thong ke') ||
      q.includes('analytics') ||
      q.includes('biểu đồ') ||
      q.includes('bieu do') ||
      q.includes('cơ cấu') ||
      q.includes('co cau') ||
      q.includes('tỷ trọng') ||
      q.includes('hạng mục nào') ||
      q.includes('danh mục nào') ||
      q.includes('tiêu nhiều nhất') ||
      q.includes('chi nhiều nhất') ||
      q.includes('tốn tiền nhất') ||
      q.includes('chi tiêu tuần này') ||
      q.includes('chi tiêu tháng này') ||
      ((q.includes('ăn uống') || q.includes('cà phê') || q.includes('cafe') || q.includes('mua sắm') || q.includes('tiền xăng') || q.includes('đi lại')) &&
        (q.includes('bao nhiêu') || q.includes('hết bao nhiêu') || q.includes('tổng') || q.includes('mấy') || q.includes('thống kê') || q.includes('báo cáo'))) ||
      dto?.activeTab === 'analytics';

    if (isAskingAnalytics && (pCtx.includes('BÁO CÁO & THỐNG KÊ CHI TIÊU') || pCtx.includes('NGÂN SÁCH THÁNG'))) {
      const aMatch = pCtx.match(/📈 BÁO CÁO & THỐNG KÊ CHI TIÊU[^:]*:([\s\S]*?)(?=\n\n[👛📅🔁📖⏰📊🧾]|$)/);
      if (aMatch) {
        const aBlock = aMatch[1].trim();
        const cleanQ = q.replace(/["']/g, '');

        // 6.1. Nếu hỏi riêng về một danh mục chi tiêu cụ thể (Ăn uống, Cà phê, Mua sắm...)
        const lines = aBlock.split('\n');
        const catLines = lines.filter((l) => l.trim().startsWith('+'));
        const matchedCatLine = catLines.find((line) => {
          const lLow = line.toLowerCase();
          if ((cleanQ.includes('ăn') || cleanQ.includes('ẩm thực') || cleanQ.includes('an uong')) && (lLow.includes('ăn') || lLow.includes('ẩm thực'))) return true;
          if ((cleanQ.includes('cà phê') || cleanQ.includes('cafe')) && (lLow.includes('cà phê') || lLow.includes('cafe'))) return true;
          if ((cleanQ.includes('mua sắm') || cleanQ.includes('mua sam')) && lLow.includes('mua')) return true;
          if ((cleanQ.includes('xăng') || cleanQ.includes('đi lại') || cleanQ.includes('di chuyển')) && (lLow.includes('xe') || lLow.includes('di chuyển') || lLow.includes('xăng'))) return true;
          if ((cleanQ.includes('phòng') || cleanQ.includes('nhà') || cleanQ.includes('tiền trọ')) && (lLow.includes('nhà') || lLow.includes('phòng') || lLow.includes('trọ'))) return true;
          if (cleanQ.includes('giải trí') && lLow.includes('giải trí')) return true;
          return false;
        });

        if (matchedCatLine) {
          const catNameMatch = matchedCatLine.match(/\+\s*([^:]+):/);
          const catName = catNameMatch ? catNameMatch[1].trim() : 'danh mục';
          const detailsPart = matchedCatLine.replace(/^[^+]*\+\s*[^:]+:\s*/, '').trim();
          return {
            reply:
              `Chào bạn iu! Chú Ếch Monett 🐸💚 đã tra cứu thống kê chi tiêu cho mục **"${catName}"** rồi nè:\n\n` +
              `• **Danh mục:** **${catName}**\n` +
              `• **Chi tiêu tháng này:** **${detailsPart}**\n\n` +
              `Bạn có thể bấm bên dưới để vào trang Báo Cáo xem chi tiết biểu đồ cột và cơ cấu chi tiêu nhé! ✨`,
            action: { label: '📊 Xem Biểu Đồ Báo Cáo', tabKey: 'analytics' },
          };
        }

        // 6.2. Nếu hỏi tiêu nhiều nhất vào việc gì
        if (q.includes('nhiều nhất') || q.includes('cao nhất') || q.includes('lớn nhất') || q.includes('tốn tiền nhất')) {
          const topMatch = aBlock.match(/\* Hạng mục chi nhiều nhất:\s*([^\n]+)/);
          if (topMatch) {
            return {
              reply:
                `Trong tháng này, danh mục bạn chi tiêu nhiều nhất là **${topMatch[1].trim()}**! 🐸💸\n\n` +
                `Bạn có thể bấm nút bên dưới để vào trang Báo Cáo xem biểu đồ phân tích chi tiết nhé!`,
              action: { label: '📊 Xem Biểu Đồ Báo Cáo', tabKey: 'analytics' },
            };
          }
        }

        // 6.3. Nếu hỏi chi tiêu tuần này
        if (q.includes('tuần') || q.includes('tuan')) {
          const weekMatch = aBlock.match(/\* Tổng chi tiêu tuần này:\s*([^\n]+)/);
          const monthMatch = aBlock.match(/\* Tổng chi tiêu tháng này:\s*([^\n]+)/);
          return {
            reply:
              `Báo cáo chi tiêu tuần này của bạn nè! 🐸📊✨\n\n` +
              `• **Tổng chi tiêu tuần này:** **${weekMatch ? weekMatch[1].trim() : 'Đang cập nhật'}**\n` +
              `• **Tổng chi tiêu cả tháng:** **${monthMatch ? monthMatch[1].trim() : 'Đang cập nhật'}**\n\n` +
              `Bạn có thể bấm vào nút bên dưới để xem chi tiết biểu đồ cột 7 ngày trong tuần nhé!`,
            action: { label: '📊 Xem Biểu Đồ Báo Cáo', tabKey: 'analytics' },
          };
        }

        return {
          reply: `Báo cáo & Phân tích chi tiêu của bạn nè! 🐸📊✨\n\n${aBlock}\n\nBạn có thể bấm nút bên dưới để xem biểu đồ phân tích chi tiết trực quan nhé!`,
          action: { label: '📊 Xem Biểu Đồ Báo Cáo', tabKey: 'analytics' },
        };
      }
    }

    // 7. NGÂN SÁCH THÁNG & CHI TIÊU HÔM NAY (BUDGET & TODAY)
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
      const bMatch = pCtx.match(/📊 NGÂN SÁCH THÁNG[^:]*:([\s\S]*?)(?=\n\n[👛📅🔁📖⏰🧾📈]|$)/);
      const tMatch = pCtx.match(/🧾 CHI TIÊU HÔM NAY[^:]*:([\s\S]*?)(?=\n\n[👛📅🔁📖⏰📊📈]|$)/);
      let resText = 'Báo cáo ngân sách & chi tiêu của bạn nè! 🐸📊\n\n';
      if (bMatch) resText += `• **Ngân sách tháng:**\n${bMatch[1].trim()}\n\n`;
      if (tMatch) resText += `• **Hôm nay:**\n${tMatch[1].trim()}`;
      return {
        reply: resText.trim(),
        action: { label: '⊞ Đến Trang Tổng Quan', tabKey: 'home' },
      };
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
          'Oa chào bạn iu nha! 🐸💚 Mình là Ếch Monett – trợ lý tài chính thông minh của bạn đây! Bạn có thể hỏi mình bất kỳ dữ liệu nào về Báo cáo chi tiêu, Ghi chú & Nhắc nhở, Tích lũy heo đất, Sự kiện đi chơi, Sổ ghi nợ, Hóa đơn định kỳ hay Ngân sách tháng nhé! ✨🪙',
      };
    }

    // 2. Hỏi về danh tính chú Ếch
    if (q.includes('bạn là ai') || q.includes('ban la ai') || q.includes('tên gì') || q.includes('ten gi')) {
      return {
        reply:
          'Mình là chú Ếch Monett 🐸 – linh vật may mắn và trợ lý tài chính đồng hành cùng bạn trên mọi nẻo đường chi tiêu! Dù bạn đang ở bất kỳ trang nào, bạn đều có thể hỏi mình về Báo cáo chi tiêu, Nhắc nhở, Sự kiện, Tích lũy, Sổ nợ, Định kỳ hay Ngân sách nhé! 🪙✨',
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
        '• **Báo cáo & Thống kê:** "Báo cáo chi tiêu tháng này", "Tôi tiêu nhiều nhất vào việc gì?", "Tiền ăn uống hết bao nhiêu?"\n' +
        '• **Nhắc nhở & Ghi chú:** "Tôi có những ghi chú gì?", "Nhắc nhở mua đồ siêu thị"\n' +
        '• **Sự kiện:** "Sự kiện đi du lịch ở Đà Nẵng đã chi tiêu bao nhiêu?", "Danh sách các sự kiện"\n' +
        '• **Tích lũy:** "Có bao nhiêu khoản tích lũy hiện tại?", "Tiến độ nuôi heo đất"\n' +
        '• **Định kỳ:** "Các khoản chi định kỳ tháng này", "Hóa đơn tiền phòng"\n' +
        '• **Sổ nợ:** "Ai đang nợ tiền tôi?", "Tôi đang vay bạn Khánh Vy bao nhiêu?"\n' +
        '• **Chi tiêu:** "Chi tiêu hôm nay là bao nhiêu?", "Ngân sách tháng này"\n\n' +
        'Hãy đặt câu hỏi để mình kiểm tra số liệu ngay cho bạn nhé! ✨',
    };
  }
}
