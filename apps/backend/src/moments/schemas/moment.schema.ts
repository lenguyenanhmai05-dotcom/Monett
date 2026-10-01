import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MomentDocument = Moment & Document;

@Schema({ timestamps: true })
export class Moment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ required: true })
  photo: string;

  @Prop({ default: '' })
  caption: string;

  @Prop({ default: 0 })
  amount: number;

  @Prop({ default: 'Chi tiêu' })
  category: string;

  @Prop({ default: 'VND' })
  currency: string;

  // reactions: Map userId -> emoji string ('❤️', '🔥', '👏', '😂', '💸')
  @Prop({ type: Map, of: String, default: {} })
  reactions: Map<string, string>;

  @Prop({
    type: [
      {
        userId: { type: Types.ObjectId, ref: 'User' },
        userName: { type: String, default: '' },
        userAvatar: { type: String, default: '' },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  comments: Array<{
    _id?: Types.ObjectId;
    userId: Types.ObjectId;
    userName: string;
    userAvatar: string;
    text: string;
    createdAt: Date;
  }>;
}

export const MomentSchema = SchemaFactory.createForClass(Moment);

MomentSchema.set('toJSON', {
  transform: (doc, ret: any) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
