import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  email: string;
  gymName: string;
  inviterName: string;
  inviteLink: string;
  role: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, gymName, inviterName, inviteLink, role }: InvitationEmailRequest = await req.json();

    console.log(`Sending invitation email to ${email} for gym ${gymName}`);

    const roleText = role === 'istruttore' ? 'istruttore' : 'allievo';

    const emailResponse = await resend.emails.send({
      from: "En Garde <app.scherma@engardes.com>",
      to: [email],
      subject: `Invito a unirsi a ${gymName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 30px 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px 10px 0 0; }
            .content { background: #f7f7f7; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 14px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #999; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚔️ En Garde</h1>
              <h2>Invito a ${gymName}</h2>
            </div>
            <div class="content">
              <p>Ciao,</p>
              <p><strong>${inviterName}</strong> ti ha invitato a unirti a <strong>${gymName}</strong> come <strong>${roleText}</strong>.</p>
              <p>Clicca sul pulsante qui sotto per accettare l'invito e creare il tuo account:</p>
              <center>
                <a href="${inviteLink}" class="button">Accetta Invito</a>
              </center>
              <p style="color: #666; font-size: 14px;">Questo invito scadrà tra 7 giorni.</p>
              <p style="color: #666; font-size: 14px;">Se non ti aspettavi questo invito, puoi ignorare questa email.</p>
            </div>
            <div class="footer">
              <p>© 2024 En Garde - Sistema di gestione per palestre di scherma</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-invitation-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);