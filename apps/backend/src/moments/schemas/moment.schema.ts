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

  // reactions: Map userId -> emoji string ('❤️', '🔥', '👏', '😂', '💸')
  @Prop({ type: Map, of: String, default: {} })
  reactions: Map<string, string>;
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
