import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const portRaw = config.getOrThrow<string>('DB_PORT');
        const port = Number(portRaw);
        if (!Number.isFinite(port)) {
          throw new Error(`DB_PORT inválido: ${portRaw}`);
        }

        const nodeEnv = config.get<string>('NODE_ENV') ?? 'development';

        return {
          type: 'mariadb',
          host: config.getOrThrow<string>('DB_HOST'),
          port,
          username: config.getOrThrow<string>('DB_USER'),
          password: config.get<string>('DB_PASS') ?? '',
          database: config.getOrThrow<string>('DB_NAME'),
          autoLoadEntities: true,
          synchronize: nodeEnv !== 'production',
        };
      },
    }),
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
