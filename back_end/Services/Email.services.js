const nodemailer = require('nodemailer');
require('dotenv').config();

async function enviarEmailAlteracaoSenha(destinatario, nomeUsuario) {
  const transporter = nodemailer.createTransport({
    service: 'gmail', // ou 'hotmail', 'outlook', etc. (ou use SMTP manual)
    auth: {
      user: process.env.EMAILAPP,
      pass: process.env.SENHAAPP,
    },
  });

  const linkRedefinicao = `http://acari-tex.vercel.app/alterar-senha`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background: #f9f9f9; padding: 20px; border-radius: 10px; color: #333;">
      <h2 style="color: #2c3e50;">Olá, ${nomeUsuario}!</h2>
      <p>Recebemos uma solicitação para alteração de senha da sua conta.</p>
      <p>Para redefinir sua senha, clique no botão abaixo:</p>
      <a href="${linkRedefinicao}" target="_blank" style="display: inline-block; margin: 20px 0; padding: 12px 24px; background-color: #2980b9; color: white; text-decoration: none; border-radius: 6px;">
        Redefinir senha
      </a>
      <p>Se você não solicitou esta alteração, ignore este e-mail. Nenhuma ação será tomada.</p>
      <br/>
      <p>Atenciosamente,<br/>Equipe do Linha Tex</p>
    </div>
  `;

  const mailOptions = {
    from: '"Suporte - Linha Tex" <linhatex.suporte@gmail.com>',
    to: destinatario,
    subject: 'Redefinição de senha',
    html: html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email enviado: ', info.response);
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
  }
}

module.exports = { enviarEmailAlteracaoSenha };