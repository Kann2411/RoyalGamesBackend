import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { SendMailDto } from './dtos/send-mail.dto';

interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

@Injectable()
export class MailingService {
  private readonly logger = new Logger(MailingService.name);
  private transporter: any;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async sendMail(sendMailDto: SendMailDto & { attachments?: MailAttachment[] }): Promise<any> {
    try {
      const mailOptions: any = {
        from: process.env.SMTP_USER,
        to: sendMailDto.to,
        subject: sendMailDto.subject,
        html: sendMailDto.html,
      };
      if (sendMailDto.attachments?.length) {
        mailOptions.attachments = sendMailDto.attachments;
      }

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent: ${info.response}`);
      return {
        success: true,
        message: 'Email sent successfully',
        messageId: info.messageId,
      };
    } catch (error) {
      const msg = (error as Error).message || String(error);
      this.logger.error(`Failed to send email: ${msg}`);
      return {
        success: false,
        message: 'Failed to send email',
        error: msg,
      };
    }
  }

  async sendWelcomeEmail(email: string, nick: string): Promise<any> {
    const html = `
      <h1>Welcome to Royal Games, ${nick}!</h1>
      <p>Thank you for joining our gaming platform.</p>
      <p>Start playing and earning chips today!</p>
    `;

    return this.sendMail({
      to: email,
      subject: 'Welcome to Royal Games',
      html,
    });
  }

  async sendPaymentConfirmationEmail(
    email: string,
    chips: number,
    amount: string,
  ): Promise<any> {
    const html = `
      <h1>Payment Confirmed</h1>
      <p>Your payment has been processed successfully.</p>
      <p><strong>Chips Purchased:</strong> ${chips}</p>
      <p><strong>Amount:</strong> $${amount}</p>
      <p>Your chips will be added to your account shortly.</p>
    `;

    return this.sendMail({
      to: email,
      subject: 'Payment Confirmation',
      html,
    });
  }
}
