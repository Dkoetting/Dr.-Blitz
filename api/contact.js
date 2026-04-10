export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).json({ error: "Invalid JSON" });
      return;
    }
  }

  const {
    name,
    email,
    phone,
    service,
    availability,
    message,
    website,
  } = body || {};

  if (website) {
    res.status(200).json({ ok: true });
    return;
  }

  if (!name || !email || !phone || !service || !availability || !message) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Missing RESEND_API_KEY" });
    return;
  }

  const from = process.env.RESEND_FROM || "Dr. Blitz <info@edvkonzepte.de>";
  const to = process.env.CONTACT_TO || "dirk@koetting.bayern";

  const sendEmail = async ({ toList, subject, text, replyTo }) => {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: toList,
        subject,
        text,
        reply_to: replyTo,
      }),
    });

    return response;
  };

  const ownerSubject = `Neue Anfrage: ${service}`;
  const ownerText = [
    "Neue Kontaktanfrage über dr-blitz.de",
    "",
    `Name: ${name}`,
    `E-Mail: ${email}`,
    `Telefon: ${phone}`,
    `Service: ${service}`,
    `Terminfenster: ${availability}`,
    "",
    "Nachricht:",
    message,
  ].join("\n");

  const ownerResponse = await sendEmail({
    toList: [to],
    subject: ownerSubject,
    text: ownerText,
    replyTo: email,
  });

  if (!ownerResponse.ok) {
    const errorText = await ownerResponse.text();
    res.status(500).json({ error: "Email failed", detail: errorText });
    return;
  }

  const confirmSubject = "Danke für Ihre Anfrage – Dr. Blitz";
  const confirmText = [
    "Vielen Dank für Ihre Anfrage.",
    "",
    "Ich melde mich zeitnah mit einem passenden Terminvorschlag.",
    "",
    `Ihr Terminfenster: ${availability}`,
    `Ihre Anfrage: ${service}`,
    "",
    "Falls Sie Ergänzungen haben, antworten Sie einfach auf diese E-Mail.",
    "",
    "Viele Grüße",
    "Dr. Blitz",
  ].join("\n");

  const confirmResponse = await sendEmail({
    toList: [email],
    subject: confirmSubject,
    text: confirmText,
    replyTo: to,
  });

  if (!confirmResponse.ok) {
    // Owner mail already sent; we still return ok to the user.
    res.status(200).json({ ok: true, warning: "confirmation_failed" });
    return;
  }

  res.status(200).json({ ok: true });
}
