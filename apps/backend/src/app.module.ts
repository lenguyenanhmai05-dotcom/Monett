import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { SeedModule } from './seed/seed.module';
import { SeedService } from './seed/seed.service';
import { FriendsModule } from './friends/friends.module';
import { MomentsModule } from './moments/moments.module';
import { TransactionsModule } from './transactions/transactions.module';
import { BudgetsModule } from './budgets/budgets.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { MessagesModule } from './messages/messages.module';
import { StorageModule } from './storage/storage.module';
import { OcrModule } from './ocr/ocr.module';
import { RemindersModule } from './reminders/reminders.module';
import { BillsAndDebtsModule } from './bills-and-debts/bills-and-debts.module';
import { AdminModule } from './admin/admin.module';
import { EventsModule } from './events/events.module';

import * as dotenv from 'dotenv';
import * as path from 'path';

import { ServeStaticModule } from '@nestjs/serve-static';

// Đảm bảo cấu hình trong file .env của dự án được ưu tiên
dotenv.config({ path: path.resolve(process.cwd(), 'apps/backend/.env'), override: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: path.join(process.cwd(), 'uploads'),
      serveRoot: '/uploads/',
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'apps/backend/.env', '../apps/backend/.env'],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const primaryUri = configService.get<string>('MONGODB_URI', 'mongodb://localhost:27017/monett');
        let selectedUri = primaryUri;

        try {
          const dnsMod = await import('dns');
          dnsMod.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
        } catch (_) {}

        if (primaryUri.includes('mongodb+srv')) {
          try {
            const mongooseMod = await import('mongoose');
            const testConn = await mongooseMod.default.createConnection(primaryUri, {
              serverSelectionTimeoutMS: 5000,
            }).asPromise();
            await testConn.close();
            console.log(`✅ Kết nối thành công tới MongoDB Atlas: ${primaryUri.replace(/:([^:@]+)@/, ':****@')}`);
          } catch (err: any) {
            console.warn(`⚠️ MongoDB Atlas SRV tạm thời không phản hồi (${err.message}). Đang thử kết nối trực tiếp qua ReplicaSet...`);
            const directAtlasUri = 'mongodb://lenguyenanhmai05_db_user:tsnIsTO4lOJkaML2@ac-mo4wbzh-shard-00-00.0al5pfn.mongodb.net:27017,ac-mo4wbzh-shard-00-01.0al5pfn.mongodb.net:27017,ac-mo4wbzh-shard-00-02.0al5pfn.mongodb.net:27017/monett?ssl=true&replicaSet=atlas-9yzv7z-shard-0&authSource=admin&retryWrites=true&w=majority';
            try {
              const mongooseMod = await import('mongoose');
              const testConn = await mongooseMod.default.createConnection(directAtlasUri, {
                serverSelectionTimeoutMS: 5000,
              }).asPromise();
              await testConn.close();
              console.log(`✅ Kết nối thành công tới MongoDB Atlas qua Direct ReplicaSet!`);
              selectedUri = directAtlasUri;
            } catch (directErr: any) {
              console.warn(`⚠️ Không thể kết nối Atlas (${directErr.message}). Tự động chuyển sang Local MongoDB...`);
              selectedUri = 'mongodb://localhost:27017/monett';
            }
          }
        }

        const maskedUri = selectedUri.replace(/:([^:@]+)@/, ':****@');
        console.log(`📡 Mongoose đang sử dụng Database: ${maskedUri}`);
        return { uri: selectedUri };
      },
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    SeedModule,
    FriendsModule,
    MomentsModule,
    TransactionsModule,
    BudgetsModule,
    AnalyticsModule,
    MessagesModule,
    StorageModule,
    OcrModule,
    RemindersModule,
    BillsAndDebtsModule,
    AdminModule,
    EventsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly seedService: SeedService) {}

  async onModuleInit() {
    try {
      await this.seedService.seedAdmin();
      await this.seedService.purgeSampleTransactions();
    } catch (error) {
      console.error('Lỗi khi khởi tạo admin/purge sample seed:', error);
    }
  }
}
