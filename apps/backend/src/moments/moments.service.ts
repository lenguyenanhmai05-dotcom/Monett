import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Moment, MomentDocument } from './schemas/moment.schema';
import { Friendship } from '../friends/schemas/friendship.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class MomentsService {
  constructor(
    @InjectModel(Moment.name) private momentModel: Model<MomentDocument>,
    @InjectModel(Friendship.name) private friendshipModel: Model<Friendship>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  /**
   * Lấy bảng tin khoảnh khắc của bản thân và bạn bè đã kết bạn
   */
  async getFeed(userId: string) {
    const userObjId = new Types.ObjectId(userId);

    // 1. Tìm tất cả bạn bè đã chấp nhận
    const friendships = await this.friendshipModel.find({
      $or: [{ requester: userObjId }, { recipient: userObjId }],
      status: 'accepted',
    });

    const friendObjIds: Types.ObjectId[] = friendships.map((f) => {
      const isRequester = f.requester.toString() === userId;
      return isRequester ? f.recipient : f.requester;
    });

    // Feed bao gồm khoảnh khắc của chính user và bạn bè
    const allUserIds = [userObjId, ...friendObjIds];

    // 2. Tự động khởi tạo dữ liệu mẫu nếu database chưa có moment nào
    const totalMoments = await this.momentModel.countDocuments();
    if (totalMoments === 0) {
      await this.seedInitialMoments(userObjId);
    }

    // 3. Lấy moments mới nhất
    const moments = await this.momentModel
      .find({ user: { $in: allUserIds } })
      .sort({ createdAt: -1 })
      .populate('user', 'fullName avatarUrl email')
      .exec();

    // 4. Chuẩn hóa format trả về cho frontend
    return moments.map((m: any) => {
      const reactionsMap = m.reactions instanceof Map ? m.reactions : new Map(Object.entries(m.reactions || {}));
      
      const reactionsCount: Record<string, number> = {
        '❤️': 0,
        '🔥': 0,
        '👏': 0,
        '😂': 0,
        '💸': 0,
      };

      let myReaction: string | null = null;

      reactionsMap.forEach((emoji: string, uId: string) => {
        if (reactionsCount[emoji] !== undefined) {
          reactionsCount[emoji]++;
        } else {
          reactionsCount[emoji] = 1;
        }
        if (uId === userId) {
          myReaction = emoji;
        }
      });

      const u = m.user || {};
      const createdAt = m.createdAt ? new Date(m.createdAt) : new Date();
      const timeStr = `${createdAt.getHours().toString().padStart(2, '0')}:${createdAt.getMinutes().toString().padStart(2, '0')}`;

      return {
        id: m._id ? m._id.toString() : m.id,
        user: {
          id: u._id ? u._id.toString() : u.id,
          name: u.fullName || 'Người dùng Monett',
          avatar: u.avatarUrl || null,
        },
        photo: m.photo,
        caption: m.caption,
        amount: m.amount,
        currency: m.currency || 'VND',
        category: m.category,
        time: timeStr,
        createdAt: m.createdAt,
        reactions: reactionsCount,
        myReaction,
        comments: (m.comments || []).map((c: any) => {
          const cDate = c.createdAt ? new Date(c.createdAt) : new Date();
          return {
            id: c._id ? c._id.toString() : c.id,
            userId: c.userId ? c.userId.toString() : '',
            userName: c.userName || 'Bạn bè',
            userAvatar: c.userAvatar || null,
            text: c.text,
            createdAt: c.createdAt,
            time: `${cDate.getHours().toString().padStart(2, '0')}:${cDate.getMinutes().toString().padStart(2, '0')}`,
          };
        }),
      };
    });
  }

  /**
   * Tạo một khoảnh khắc mới
   */
  async createMoment(userId: string, data: { photo: string; caption?: string; amount?: number; category?: string; currency?: string }) {
    if (!data.photo) {
      throw new BadRequestException('Vui lòng cung cấp link hình ảnh khoảnh khắc');
    }

    const newMoment = new this.momentModel({
      user: new Types.ObjectId(userId),
      photo: data.photo,
      caption: data.caption || '',
      amount: data.amount || 0,
      currency: data.currency || 'VND',
      category: data.category || 'Chi tiêu',
      reactions: new Map(),
    });

    return newMoment.save();
  }

  /**
   * Thả cảm xúc / Đổi cảm xúc / Bỏ cảm xúc
   */
  async reactMoment(momentId: string, userId: string, emoji: string) {
    let objId: Types.ObjectId;
    try {
      objId = new Types.ObjectId(momentId);
    } catch {
      throw new BadRequestException('ID bài đăng không hợp lệ');
    }

    const moment = await this.momentModel.findById(objId);
    if (!moment) {
      throw new NotFoundException('Không tìm thấy khoảnh khắc');
    }

    if (!moment.reactions) {
      moment.reactions = new Map();
    }

    const currentEmoji = moment.reactions.get(userId);
    if (currentEmoji === emoji) {
      // Bỏ reaction nếu click lại cùng 1 emoji
      moment.reactions.delete(userId);
    } else {
      // Đặt emoji mới
      moment.reactions.set(userId, emoji);
    }

    moment.markModified('reactions');
    await moment.save();

    // Tính lại reactions summary
    const reactionsCount: Record<string, number> = {
      '❤️': 0,
      '🔥': 0,
      '👏': 0,
      '😂': 0,
      '💸': 0,
    };
    let myReaction: string | null = null;

    moment.reactions.forEach((e: string, uId: string) => {
      if (reactionsCount[e] !== undefined) reactionsCount[e]++;
      if (uId === userId) myReaction = e;
    });

    return {
      momentId,
      reactions: reactionsCount,
      myReaction,
    };
  }

  /**
   * Lấy danh sách user đã thả cảm xúc cho khoảnh khắc
   */
  async getMomentReactions(momentId: string) {
    let objId: Types.ObjectId;
    try {
      objId = new Types.ObjectId(momentId);
    } catch {
      throw new BadRequestException('ID khoảnh khắc không hợp lệ');
    }

    const moment = await this.momentModel.findById(objId);
    if (!moment) {
      throw new NotFoundException('Không tìm thấy khoảnh khắc');
    }

    const reactionsMap = moment.reactions instanceof Map ? moment.reactions : new Map(Object.entries(moment.reactions || {}));
    const userIdsStr = Array.from(reactionsMap.keys());
    
    // Fetch user details
    const users = await this.userModel.find({ _id: { $in: userIdsStr.map(id => new Types.ObjectId(id)) } }, 'fullName avatarUrl email');

    const result = users.map((u) => {
      const emoji = reactionsMap.get(u._id.toString());
      return {
        userId: u._id.toString(),
        fullName: u.fullName || 'Người dùng Monett',
        avatarUrl: u.avatarUrl || null,
        emoji,
      };
    });

    return result;
  }

  /**
   * Cập nhật bài đăng khoảnh khắc của chính mình
   */
  async updateMoment(
    momentId: string,
    userId: string,
    updateData: { caption?: string; amount?: number; category?: string; photo?: string; currency?: string },
  ) {
    let objId: Types.ObjectId;
    try {
      objId = new Types.ObjectId(momentId);
    } catch {
      throw new BadRequestException('ID khoảnh khắc không hợp lệ');
    }

    const moment = await this.momentModel.findById(objId);
    if (!moment) {
      throw new NotFoundException('Không tìm thấy khoảnh khắc');
    }

    if (moment.user.toString() !== userId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa bài đăng này');
    }

    if (updateData.caption !== undefined) moment.caption = updateData.caption;
    if (updateData.amount !== undefined) moment.amount = updateData.amount;
    if (updateData.category !== undefined) moment.category = updateData.category;
    if (updateData.photo !== undefined) moment.photo = updateData.photo;
    if (updateData.currency !== undefined) (moment as any).currency = updateData.currency;

    await moment.save();
    return moment;
  }

  /**
   * Xóa bài đăng khoảnh khắc của chính mình
   */
  async deleteMoment(momentId: string, userId: string) {
    let objId: Types.ObjectId;
    try {
      objId = new Types.ObjectId(momentId);
    } catch {
      throw new BadRequestException('ID khoảnh khắc không hợp lệ');
    }

    const moment = await this.momentModel.findById(objId);
    if (!moment) {
      throw new NotFoundException('Không tìm thấy khoảnh khắc');
    }

    if (moment.user.toString() !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa bài đăng này');
    }

    await this.momentModel.findByIdAndDelete(objId);
    return { success: true, message: 'Đã xóa bài đăng thành công' };
  }

  /**
   * Thêm bình luận / gửi tin nhắn vào khoảnh khắc
   */
  async addComment(momentId: string, userId: string, text: string) {
    if (!text || !text.trim()) {
      throw new BadRequestException('Nội dung tin nhắn không được để trống');
    }

    let objId: Types.ObjectId;
    try {
      objId = new Types.ObjectId(momentId);
    } catch {
      throw new BadRequestException('ID khoảnh khắc không hợp lệ');
    }

    const moment = await this.momentModel.findById(objId);
    if (!moment) {
      throw new NotFoundException('Không tìm thấy khoảnh khắc');
    }

    const user = await this.userModel.findById(userId);
    const commentObj = {
      userId: new Types.ObjectId(userId),
      userName: user?.fullName || 'Người dùng Monett',
      userAvatar: user?.avatarUrl || '',
      text: text.trim(),
      createdAt: new Date(),
    };

    if (!moment.comments) {
      moment.comments = [];
    }
    moment.comments.push(commentObj as any);
    await moment.save();

    const cDate = commentObj.createdAt;
    return {
      message: 'Đã gửi tin nhắn thành công',
      comment: {
        id: (commentObj as any)._id ? (commentObj as any)._id.toString() : new Date().getTime().toString(),
        userId,
        userName: commentObj.userName,
        userAvatar: commentObj.userAvatar,
        text: commentObj.text,
        createdAt: commentObj.createdAt,
        time: `${cDate.getHours().toString().padStart(2, '0')}:${cDate.getMinutes().toString().padStart(2, '0')}`,
      },
      commentsCount: moment.comments.length,
    };
  }

  /**
   * Khởi tạo bài đăng mẫu ban đầu
   */
  private async seedInitialMoments(creatorId: Types.ObjectId) {
    const demoItems = [
      {
        user: creatorId,
        photo: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=600&auto=format&fit=crop',
        caption: "Pizza 4P's Bến Thành cùng bạn bè 🍕",
        amount: -450000,
        category: '🍕 Ẩm thực',
        reactions: new Map(),
      },
      {
        user: creatorId,
        photo: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=600&auto=format&fit=crop',
        caption: 'Cà phê sáng chạy deadline ☕',
        amount: -45000,
        category: '☕ Cà phê',
        reactions: new Map(),
      },
    ];

    await this.momentModel.insertMany(demoItems);
  }
}
