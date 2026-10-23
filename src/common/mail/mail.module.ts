import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service.js';

/** Global module that provides the SMTP `MailService`. */
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
