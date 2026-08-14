import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { MailingService } from '../mailing/mailing.service';
import { SubmitApplicationDto } from './dtos/submit-application.dto';

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'royalgames2025@gmail.com';
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

@Injectable()
export class CareersService {
  private readonly logger = new Logger(CareersService.name);

  constructor(private mailingService: MailingService) {}

  async submitApplication(dto: SubmitApplicationDto, cv?: Express.Multer.File) {
    if (!cv) {
      throw new BadRequestException('Debés adjuntar tu CV');
    }
    if (!ALLOWED_MIME_TYPES.includes(cv.mimetype)) {
      throw new BadRequestException('El CV debe ser un archivo PDF o Word (.doc, .docx)');
    }
    if (cv.size > MAX_FILE_SIZE) {
      throw new BadRequestException('El CV no puede pesar más de 5MB');
    }

    const result = await this.mailingService.sendMail({
      to: SUPPORT_EMAIL,
      subject: `[Trabaja con Nosotros] ${dto.name}`,
      html: `
        <h2>Nueva postulación laboral</h2>
        <p><strong>Nombre:</strong> ${dto.name}</p>
        <p><strong>Email:</strong> ${dto.email}</p>
        <p><strong>Por qué quiere trabajar con nosotros:</strong></p>
        <p>${dto.message}</p>
      `,
      attachments: [
        {
          filename: cv.originalname,
          content: cv.buffer,
          contentType: cv.mimetype,
        },
      ],
    });

    if (!result?.success) {
      this.logger.error(`Failed to send job application email for ${dto.email}`);
      throw new BadRequestException('No se pudo enviar tu postulación. Intentá de nuevo más tarde.');
    }

    return { message: 'Application submitted' };
  }
}
