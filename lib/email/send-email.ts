import nodemailer from 'nodemailer';
import { serverEnv } from '@/lib/env';

export async function sendEmail({ to, subject, html, text }: { to: string; subject: string; html: string; text: string }) {
  const transporter = nodemailer.createTransport({
    host: serverEnv.smtp.host,
    port: serverEnv.smtp.port,
    secure: serverEnv.smtp.port === 465,
    auth: serverEnv.smtp.user ? { user: serverEnv.smtp.user, pass: serverEnv.smtp.password } : undefined,
  });
  await transporter.sendMail({ from: serverEnv.smtp.from, to, subject, html, text });
}
