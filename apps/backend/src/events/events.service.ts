import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MonettEventModel, EventDocument } from './schemas/event.schema';
import { EventInvitationModel, EventInvitationDocument } from './schemas/event-invitation.schema';
import { CreateEventDto, UpdateEventDto, InviteFriendDto } from './dto/create-event.dto';
import { MessagesGateway } from '../messages/messages.gateway';

const SEED_EVENTS_FOR_MAI = [
  {
    title: 'Chuyến du lịch Đà Lạt cùng bạn bè 🌲🍓',
    startDate: '24/10/2026',
    endDate: '28/10/2026',
    location: 'Đà Lạt, Lâm Đồng',
    estimatedBudget: 8500000,
    spentAmount: 5420000,
    incomeAmount: 0,
    description: 'Chuyến đi săn mây đồi Cầu Đất, cafe thung lũng chill ngắm hoàng hôn, ăn lẩu gà lá é Tao Ngộ và bánh tráng nướng chợ đêm.',
    status: 'ongoing',
    expenses: [
      {
        id: 'exp-dl-1',
        title: 'Vé xe Limousine khứ hồi Sài Gòn - Đà Lạt',
        amount: 1800000,
        category: 'Đi lại',
        categoryIcon: '🚗',
        date: '24/10/2026',
        createdAt: '2026-10-24T09:00:00.000Z',
        payer: 'Ánh Mai',
        note: 'Đặt vé khứ hồi cho 4 người xe phòng riêng tiện nghi.',
        type: 'expense',
      },
      {
        id: 'exp-dl-2',
        title: 'Homestay Mây Lang Thang (3 đêm)',
        amount: 2400000,
        category: 'Khách sạn',
        categoryIcon: '🏠',
        date: '24/10/2026',
        createdAt: '2026-10-24T14:00:00.000Z',
        payer: 'Ánh Mai',
        note: 'View thung lũng ngắm hoàng hôn cực chill.',
        type: 'expense',
      },
      {
        id: 'exp-dl-3',
        title: 'Lẩu gà lá é Tao Ngộ 3/4',
        amount: 520000,
        category: 'Ăn uống',
        categoryIcon: '🍲',
        date: '25/10/2026',
        createdAt: '2026-10-25T19:30:00.000Z',
        payer: 'Ánh Mai',
        note: 'Nồi lẩu lớn + nấm thêm và nước ngọt.',
        type: 'expense',
      },
      {
        id: 'exp-dl-4',
        title: 'Cafe Túi Mơ To & chụp ảnh',
        amount: 360000,
        category: 'Cafe',
        categoryIcon: '☕',
        date: '26/10/2026',
        createdAt: '2026-10-26T10:00:00.000Z',
        payer: 'Ánh Mai',
        note: '4 phần nước đặc biệt + bánh ngọt.',
        type: 'expense',
      },
      {
        id: 'exp-dl-5',
        title: 'Dâu tây vườn & đặc sản mứt dẻo',
        amount: 340000,
        category: 'Mua sắm',
        categoryIcon: '🍓',
        date: '26/10/2026',
        createdAt: '2026-10-26T15:30:00.000Z',
        payer: 'Ánh Mai',
        note: 'Mua quà mang về.',
        type: 'expense',
      },
    ],
  },
  {
    title: 'Tiệc Sinh Nhật & BBQ Cuối Tuần 🎂🎉',
    startDate: '01/11/2026',
    endDate: '01/11/2026',
    location: 'Rooftop Chill Garden, TP. Hồ Chí Minh',
    estimatedBudget: 3500000,
    spentAmount: 1200000,
    incomeAmount: 0,
    description: 'Bữa tiệc sinh nhật tuổi mới ấm cúng cùng bạn bè thân thiết, nướng BBQ và nghe nhạc acoustic nhẹ nhàng.',
    status: 'upcoming',
    expenses: [
      {
        id: 'exp-bbq-1',
        title: 'Đặt cọc địa điểm sân thượng & trang trí',
        amount: 1200000,
        category: 'Tiệc tùng',
        categoryIcon: '🎈',
        date: '22/10/2026',
        createdAt: '2026-10-22T11:00:00.000Z',
        payer: 'Ánh Mai',
        note: 'Đã cọc 50% tiền thuê sân vườn.',
        type: 'expense',
      },
    ],
  },
  {
    title: 'Cắm trại & Trekking Vườn Quốc Gia Cát Tiên 🏕️🌿',
    startDate: '15/11/2026',
    endDate: '16/11/2026',
    location: 'VQG Cát Tiên, Đồng Nai',
    estimatedBudget: 2800000,
    spentAmount: 650000,
    incomeAmount: 0,
    description: 'Chuyến dã ngoại cuối tuần hòa mình vào thiên nhiên, cắm trại bên bờ sông Đồng Nai và ngắm thú đêm Bàu Sấu.',
    status: 'upcoming',
    expenses: [
      {
        id: 'exp-ct-1',
        title: 'Mua lều cắm trại 4 người & túi ngủ',
        amount: 650000,
        category: 'Dã ngoại',
        categoryIcon: '⛺',
        date: '23/10/2026',
        createdAt: '2026-10-23T16:00:00.000Z',
        payer: 'Ánh Mai',
        note: 'Lều chống thấm nước Decathlon.',
        type: 'expense',
      },
    ],
  },
  {
    title: 'Kỳ nghỉ Phú Quốc hè 2026 🏖️🌊',
    startDate: '15/08/2026',
    endDate: '19/08/2026',
    location: 'Phú Quốc, Kiên Giang',
    estimatedBudget: 12000000,
    spentAmount: 11350000,
    incomeAmount: 0,
    description: 'Kỳ nghỉ biển thư giãn, lặn ngắm san hô đảo An Thới, ngắm hoàng hôn Sunset Sanato và thưởng thức hải sản tươi ngon.',
    status: 'completed',
    expenses: [
      {
        id: 'exp-pq-1',
        title: 'Vé máy bay khứ hồi Vietjet',
        amount: 4200000,
        category: 'Đi lại',
        categoryIcon: '✈️',
        date: '15/08/2026',
        createdAt: '2026-08-15T07:00:00.000Z',
        payer: 'Ánh Mai',
        type: 'expense',
      },
      {
        id: 'exp-pq-2',
        title: 'Resort Bãi Trường 4N3Đ',
        amount: 4500000,
        category: 'Khách sạn',
        categoryIcon: '🏨',
        date: '15/08/2026',
        createdAt: '2026-08-15T12:00:00.000Z',
        payer: 'Ánh Mai',
        type: 'expense',
      },
      {
        id: 'exp-pq-3',
        title: 'Tour cano 4 đảo & lặn san hô',
        amount: 1600000,
        category: 'Tham quan',
        categoryIcon: '🤿',
        date: '17/08/2026',
        createdAt: '2026-08-17T09:00:00.000Z',
        payer: 'Ánh Mai',
        type: 'expense',
      },
      {
        id: 'exp-pq-4',
        title: 'Hải sản Hàm Ninh & bún quậy Kiến Xây',
        amount: 1050000,
        category: 'Ăn uống',
        categoryIcon: '🦐',
        date: '18/08/2026',
        createdAt: '2026-08-18T19:00:00.000Z',
        payer: 'Ánh Mai',
        type: 'expense',
      },
    ],
  },
];

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(MonettEventModel.name)
    private readonly eventModel: Model<EventDocument>,
    @InjectModel(EventInvitationModel.name)
    private readonly invitationModel: Model<EventInvitationDocument>,
    @Optional()
    private readonly messagesGateway?: MessagesGateway,
  ) {}

  async findAllForUser(userId: string, email?: string): Promise<MonettEventModel[]> {
    let userObjId: Types.ObjectId | null = null;
    try {
      userObjId = new Types.ObjectId(userId);
    } catch {}

    const normEmail = (email || '').trim().toLowerCase();

    const memberMatchConditions: any[] = [
      { id: userId, status: 'accepted' },
    ];
    if (userObjId) {
      memberMatchConditions.push({ user: userObjId, status: 'accepted' });
    }
    if (normEmail) {
      memberMatchConditions.push({ email: normEmail, status: 'accepted' });
    }

    const queryConditions: any[] = [
      { ownerId: userId },
      { members: { $elemMatch: { $or: memberMatchConditions } } },
    ];

    if (userObjId) {
      queryConditions.push({ owner: userObjId });
    }

    let list = await this.eventModel.find({ $or: queryConditions }).sort({ createdAt: -1 });

    // Seed events cho tài khoản Ánh Mai nếu trong DB chưa có
    if (list.length === 0 && normEmail === 'lenguyenanhmai113@gmail.com') {
      const seeded: any[] = [];
      for (const item of SEED_EVENTS_FOR_MAI) {
        const doc = new this.eventModel({
          ...item,
          owner: userObjId || new Types.ObjectId('6aabdd10a40d5b80cb4576df'),
          ownerId: userId,
          ownerName: 'Ánh Mai',
          members: [
            {
              user: userObjId || new Types.ObjectId('6aabdd10a40d5b80cb4576df'),
              id: userId,
              name: 'Ánh Mai',
              email: normEmail,
              role: 'owner',
              status: 'accepted',
            },
          ],
        });
        const saved = await doc.save();
        seeded.push(saved);
      }
      return seeded;
    }

    return list;
  }

  async findById(id: string): Promise<MonettEventModel> {
    let evt: any = null;
    try {
      if (Types.ObjectId.isValid(id)) {
        evt = await this.eventModel.findById(id);
      }
    } catch {}
    if (!evt) {
      evt = await this.eventModel.findOne({ id });
    }
    if (!evt) {
      throw new NotFoundException('Không tìm thấy sự kiện');
    }
    return evt;
  }

  async create(userId: string, userFullName: string, userEmail: string, dto: CreateEventDto): Promise<MonettEventModel> {
    let userObjId: Types.ObjectId | null = null;
    try {
      userObjId = new Types.ObjectId(userId);
    } catch {}

    const newEvent = new this.eventModel({
      ...dto,
      owner: userObjId || new Types.ObjectId(),
      ownerId: userId,
      ownerName: userFullName || 'Chủ sự kiện',
      spentAmount: 0,
      incomeAmount: 0,
      expenses: [],
      members: [
        {
          user: userObjId || undefined,
          id: userId,
          name: userFullName || 'Chủ sự kiện',
          email: userEmail || '',
          role: 'owner',
          status: 'accepted',
        },
      ],
    });

    return newEvent.save();
  }

  async update(userId: string, id: string, dto: UpdateEventDto): Promise<MonettEventModel> {
    let event: any = null;
    try {
      if (Types.ObjectId.isValid(id)) {
        event = await this.eventModel.findById(id);
      }
    } catch {}
    if (!event) {
      event = await this.eventModel.findOne({ id });
    }
    if (!event) {
      throw new NotFoundException('Không tìm thấy sự kiện cần cập nhật');
    }

    if (dto.title !== undefined) event.title = dto.title;
    if (dto.startDate !== undefined) event.startDate = dto.startDate;
    if (dto.endDate !== undefined) event.endDate = dto.endDate;
    if (dto.location !== undefined) event.location = dto.location;
    if (dto.estimatedBudget !== undefined) event.estimatedBudget = dto.estimatedBudget;
    if (dto.description !== undefined) event.description = dto.description;
    if (dto.status !== undefined) event.status = dto.status;
    if (dto.expenses !== undefined) {
      event.expenses = dto.expenses;
      event.spentAmount = dto.expenses.filter((e) => e.type !== 'income').reduce((s, e) => s + (e.amount || 0), 0);
      event.incomeAmount = dto.expenses.filter((e) => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
    }
    if (dto.spentAmount !== undefined) event.spentAmount = dto.spentAmount;
    if (dto.incomeAmount !== undefined) event.incomeAmount = dto.incomeAmount;
    if (dto.members !== undefined) event.members = dto.members;

    return event.save();
  }

  async delete(userId: string, id: string): Promise<{ success: boolean; message: string }> {
    let event: any = null;
    try {
      if (Types.ObjectId.isValid(id)) {
        event = await this.eventModel.findById(id);
      }
    } catch {}
    if (!event) {
      event = await this.eventModel.findOne({ id });
    }
    if (!event) {
      throw new NotFoundException('Không tìm thấy sự kiện cần xóa');
    }

    if (event.ownerId && event.ownerId !== userId && event.owner?.toString() !== userId) {
      throw new ForbiddenException('Chỉ chủ sự kiện mới có quyền xóa sự kiện này');
    }

    await this.eventModel.deleteOne({ _id: event._id });
    // Dọn dẹp cả lời mời liên quan
    await this.invitationModel.deleteMany({ eventId: event._id.toString() });

    return { success: true, message: 'Đã xóa sự kiện thành công' };
  }

  async inviteFriend(
    inviterId: string,
    inviterName: string,
    inviterEmail: string,
    eventId: string,
    dto: InviteFriendDto,
  ): Promise<{ success: boolean; invite: any; event: any }> {
    let event: any = null;
    try {
      if (Types.ObjectId.isValid(eventId)) {
        event = await this.eventModel.findById(eventId);
      }
    } catch {}
    if (!event) {
      event = await this.eventModel.findOne({ id: eventId });
    }
    if (!event) {
      throw new NotFoundException('Không tìm thấy sự kiện');
    }

    const recipientId = dto.recipientId;
    const recipientEmail = (dto.recipientEmail || '').trim().toLowerCase();
    const recipientName = dto.recipientName;

    // Kiểm tra thành viên đã có trong danh sách chưa
    let memberIndex = event.members.findIndex(
      (m) => m.id === recipientId || (recipientEmail && m.email?.toLowerCase() === recipientEmail),
    );

    let recipientObjId: Types.ObjectId | undefined;
    try {
      recipientObjId = new Types.ObjectId(recipientId);
    } catch {}

    if (memberIndex >= 0) {
      // Cập nhật trạng thái thành pending nếu chưa accepted
      if (event.members[memberIndex].status !== 'accepted') {
        event.members[memberIndex].status = 'pending';
        event.members[memberIndex].invitedAt = new Date().toLocaleDateString('vi-VN');
      }
    } else {
      event.members.push({
        user: recipientObjId,
        id: recipientId,
        name: recipientName,
        email: recipientEmail,
        avatarUrl: dto.avatarUrl,
        role: 'member',
        status: 'pending',
        invitedAt: new Date().toLocaleDateString('vi-VN'),
      });
    }

    await event.save();

    // Lưu hoặc cập nhật lời mời vào collection event_invitations
    const eventIdStr = event._id.toString();
    let inviterObjId: Types.ObjectId | undefined;
    try {
      inviterObjId = new Types.ObjectId(inviterId);
    } catch {}

    const invite = await this.invitationModel.findOneAndUpdate(
      {
        eventId: eventIdStr,
        $or: [{ recipientId }, ...(recipientEmail ? [{ recipientEmail }] : [])],
      },
      {
        eventId: eventIdStr,
        eventTitle: event.title,
        eventLocation: event.location,
        eventStartDate: event.startDate,
        inviterName: inviterName || event.ownerName || 'Bạn bè',
        inviterId: inviterObjId,
        inviterEmail,
        recipientId,
        recipientName,
        recipientEmail,
        status: 'pending',
        eventData: event.toJSON(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // Gửi tín hiệu Realtime qua WebSocket nếu đối phương đang online
    if (this.messagesGateway?.server) {
      const notifPayload = {
        id: `notif-invite-${invite._id}`,
        type: 'event',
        title: 'Lời mời tham gia sự kiện 🏕️',
        message: `${inviterName || event.ownerName} đã mời bạn tham gia sự kiện "${event.title}". Bạn có muốn tham gia không?`,
        createdAt: new Date().toISOString(),
        read: false,
        iconName: 'calendar',
        iconColor: '#059669',
        iconBg: '#DCFCE7',
        metadata: {
          type: 'event_invite',
          inviteId: invite._id.toString(),
          eventId: eventIdStr,
          eventTitle: event.title,
          inviterName: inviterName || event.ownerName,
          inviterId,
          inviterEmail,
          recipientId,
          recipientName,
          recipientEmail,
          inviteStatus: 'pending',
          targetTab: 'events',
        },
      };

      this.messagesGateway.server.to(`user_${recipientId}`).emit('event_invitation', invite);
      this.messagesGateway.server.to(`user_${recipientId}`).emit('event_notification', notifPayload);
    }

    return { success: true, invite, event };
  }

  async getPendingInvitations(userId: string, email?: string): Promise<EventInvitationModel[]> {
    const normEmail = (email || '').trim().toLowerCase();
    const orConditions: any[] = [{ recipientId: userId }];
    if (normEmail) {
      orConditions.push({ recipientEmail: normEmail });
    }

    return this.invitationModel
      .find({
        $or: orConditions,
        status: 'pending',
      })
      .sort({ createdAt: -1 });
  }

  async acceptInvitation(
    userId: string,
    userFullName: string,
    userEmail: string,
    inviteId: string,
  ): Promise<{ success: boolean; event: MonettEventModel }> {
    let invite: any = null;
    try {
      if (Types.ObjectId.isValid(inviteId)) {
        invite = await this.invitationModel.findById(inviteId);
      }
    } catch {}
    if (!invite) {
      invite = await this.invitationModel.findOne({ id: inviteId });
    }
    if (!invite) {
      throw new NotFoundException('Không tìm thấy lời mời tham gia sự kiện');
    }

    invite.status = 'accepted';
    await invite.save();

    // Cập nhật member trong sự kiện
    let event: any = null;
    try {
      if (Types.ObjectId.isValid(invite.eventId)) {
        event = await this.eventModel.findById(invite.eventId);
      }
    } catch {}
    if (!event) {
      event = await this.eventModel.findOne({ id: invite.eventId });
    }
    if (!event) {
      throw new NotFoundException('Không tìm thấy sự kiện của lời mời này');
    }

    const normEmail = (userEmail || invite.recipientEmail || '').trim().toLowerCase();
    const mIndex = event.members.findIndex(
      (m) => m.id === userId || (normEmail && m.email?.toLowerCase() === normEmail),
    );

    if (mIndex >= 0) {
      event.members[mIndex].status = 'accepted';
      event.members[mIndex].joinedAt = new Date().toLocaleDateString('vi-VN');
      if (userFullName) event.members[mIndex].name = userFullName;
      if (userEmail) event.members[mIndex].email = userEmail;
    } else {
      let uObjId: Types.ObjectId | undefined;
      try {
        uObjId = new Types.ObjectId(userId);
      } catch {}
      event.members.push({
        user: uObjId,
        id: userId,
        name: userFullName || invite.recipientName || 'Bạn bè',
        email: userEmail || invite.recipientEmail || '',
        role: 'member',
        status: 'accepted',
        joinedAt: new Date().toLocaleDateString('vi-VN'),
      });
    }

    await event.save();

    // Thông báo cho chủ sự kiện qua socket
    if (this.messagesGateway?.server && invite.inviterId) {
      const inviterIdStr = invite.inviterId.toString();
      this.messagesGateway.server.to(`user_${inviterIdStr}`).emit('event_accepted', {
        eventId: event._id.toString(),
        eventTitle: event.title,
        recipientName: userFullName || invite.recipientName,
      });
    }

    return { success: true, event };
  }

  async declineInvitation(userId: string, inviteId: string): Promise<{ success: boolean }> {
    let invite: any = null;
    try {
      if (Types.ObjectId.isValid(inviteId)) {
        invite = await this.invitationModel.findById(inviteId);
      }
    } catch {}
    if (!invite) {
      invite = await this.invitationModel.findOne({ id: inviteId });
    }
    if (!invite) {
      throw new NotFoundException('Không tìm thấy lời mời');
    }

    invite.status = 'declined';
    await invite.save();

    // Cập nhật member trong sự kiện: xóa hoặc đánh dấu declined
    try {
      if (Types.ObjectId.isValid(invite.eventId)) {
        const event = await this.eventModel.findById(invite.eventId);
        if (event) {
          event.members = event.members.filter(
            (m) => !(m.id === userId || (invite.recipientEmail && m.email === invite.recipientEmail)),
          );
          await event.save();
        }
      }
    } catch {}

    return { success: true };
  }
}
