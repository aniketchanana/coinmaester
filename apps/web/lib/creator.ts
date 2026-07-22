const SPONSOR_EMAIL = 'aniket.chanana@gmail.com';
const WHATSAPP_NUMBER = '919588195330';

const SPONSOR_SUBJECT = 'Coinmaester - interested in supporting or collaborating';

const SPONSOR_BODY = `Hi Aniket,

I came across Coinmaester and really like what you've built. I'd like to connect and explore ways to support the project - whether that's funding, collaboration, or helping with hosting so a shared online option could become viable someday.

Looking forward to hearing from you.

Best regards`;

/** Shorter chat-friendly copy for WhatsApp. */
const WHATSAPP_BODY = `Hi Aniket, I came across Coinmaester and really like what you've built. I'd like to connect and explore ways to support the project - funding, collaboration, or helping with hosting. Looking forward to hearing from you.`;

/**
 * Opens Gmail compose in the browser with subject/body prefilled.
 * More reliable than mailto: when no desktop mail client is configured.
 */
export const SPONSOR_MAILTO = `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${encodeURIComponent(SPONSOR_EMAIL)}&su=${encodeURIComponent(SPONSOR_SUBJECT)}&body=${encodeURIComponent(SPONSOR_BODY)}`;

/** Classic mailto: fallback for README / clients that prefer a local mail app. */
export const SPONSOR_MAILTO_NATIVE = `mailto:${SPONSOR_EMAIL}?subject=${encodeURIComponent(SPONSOR_SUBJECT)}&body=${encodeURIComponent(SPONSOR_BODY)}`;

/** Opens WhatsApp with a polite support / collaboration message prefilled. */
export const SPONSOR_WHATSAPP = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_BODY)}`;

export const CREATOR = {
  name: 'Aniket Chanana',
  shortName: 'Aniket',
  email: SPONSOR_EMAIL,
  github: 'https://github.com/aniketchanana',
  site: 'https://aniketchanana.github.io',
  linkedin: 'https://www.linkedin.com/in/aniket-chanana-470471147/',
  whatsappDisplay: '+91-9588195330',
  whatsapp: SPONSOR_WHATSAPP,
  handle: '@aniketchanana',
} as const;

export const REPO_URL = 'https://github.com/aniketchanana/coinmaester';
