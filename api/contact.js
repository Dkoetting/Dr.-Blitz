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
    service,
    availability,
    message,
    website,
  } = body || {};

  if (website) {
    res.status(200).json({ ok: true });
    return;
  }

  if (!name || !email || !service || !availability || !message) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Missing RESEND_API_KEY" });
    return;
  }

  const from = process.env.RESEND_FROM || "Dr. Blitz <dirk@koetting.bayern>";
  const to = process.env.CONTACT_TO || "dirk@koetting.bayern";
  const subject = `Neue Anfrage: ${service}`;
  const text = [
    "Neue Kontaktanfrage über dr-blitz.de",
    "",
    `Name: ${name}`,
    `E-Mail: ${email}`,
    `Service: ${service}`,
    `Terminfenster: ${availability}`,
    "",
    "Nachricht:",
    message,
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      reply_to: email,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    res.status(500).json({ error: "Email failed", detail: errorText });
    return;
  }

  res.status(200).json({ ok: true });
}
