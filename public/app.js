const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('#main-nav');
const dialog = document.querySelector('#contact-dialog');
const place = document.querySelector('#meeting-place');
const callLink = document.querySelector('#call-link');
const emailLink = document.querySelector('#email-link');
const pending = document.querySelector('#contact-pending');
let contact = {};
let goal = 'Discussing my lending goals';
let requestedMethod = '';

menuButton.addEventListener('click', () => {
  const expanded = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!expanded));
  menuButton.querySelector('.sr-only').textContent = expanded ? 'Open menu' : 'Close menu';
  nav.classList.toggle('is-open', !expanded);
});

function closeMenu() {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.querySelector('.sr-only').textContent = 'Open menu';
  nav.classList.remove('is-open');
}
nav.querySelectorAll('a, button').forEach((element) => element.addEventListener('click', closeMenu));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });
document.addEventListener('click', (event) => { if (!event.target.closest('.nav-wrap')) closeMenu(); });

function updateContactLinks() {
  const phone = typeof contact.phone === 'string' && /^\+?[\d ()-]{6,24}$/.test(contact.phone) ? contact.phone.replace(/[ ()-]/g, '') : '';
  const email = typeof contact.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email) ? contact.email : '';
  callLink.hidden = !phone;
  emailLink.hidden = !email;
  if (phone) callLink.href = `tel:${phone}`;
  if (email) {
    const subject = 'Let’s arrange a lending conversation';
    const body = `Hi Sue,\n\nI’d like to talk about: ${goal}.\n\nMy meeting preference: ${place.value}.\n\nA good time to reach me is:\n\nThanks,\n`;
    emailLink.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
  document.querySelector('#contact-links').hidden = !phone && !email;
  pending.hidden = Boolean(phone && email);
  if (phone && !email) pending.innerHTML = '<strong>Sue’s email is awaiting confirmation.</strong><p>You can use the verified phone contact above.</p>';
  if (email && !phone) pending.innerHTML = '<strong>Sue’s phone number is awaiting confirmation.</strong><p>You can use the verified email contact above.</p>';
}

document.querySelectorAll('[data-contact]').forEach((button) => {
  button.addEventListener('click', () => {
    goal = button.dataset.goal || 'Discussing my lending goals';
    requestedMethod = button.dataset.method || '';
    document.querySelector('#contact-intro').textContent = button.dataset.goal
      ? `Let’s start with ${goal.toLowerCase()}. Arrange a conversation with Sue at a time and place that suits you.`
      : 'Choose how you’d like to get in touch and arrange a meeting at a place that suits you.';
    updateContactLinks();
    dialog.showModal();
    document.body.classList.add('dialog-open');
    if (requestedMethod === 'phone' && !callLink.hidden) callLink.focus();
    if (requestedMethod === 'email' && !emailLink.hidden) emailLink.focus();
  });
});
place.addEventListener('change', updateContactLinks);
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => document.body.classList.remove('dialog-open'));
dialog.addEventListener('click', (event) => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});
document.querySelector('#year').textContent = String(new Date().getFullYear());

// Only public, verified contact details belong in contact.json. Never credentials.
const embeddedContact = document.querySelector('#demo-contact-config');
const contactRequest = embeddedContact ? Promise.resolve(JSON.parse(embeddedContact.textContent)) : fetch('/contact.json').then((response) => {
  if (!response.ok) throw new Error('Contact configuration unavailable');
  return response.json();
});
contactRequest.then((data) => {
  contact = data && typeof data === 'object' ? data : {};
  updateContactLinks();
  if (!callLink.hidden) document.querySelectorAll('[data-phone-display]').forEach((item) => { item.textContent = contact.phoneDisplay || contact.phone; });
  if (!emailLink.hidden) document.querySelectorAll('[data-email-display]').forEach((item) => { item.textContent = contact.email; });
}).catch(() => { /* The review concept keeps an honest pending state. */ });

document.querySelectorAll('a[href="#open-banking-question"]').forEach((link) => {
  link.addEventListener('click', () => { document.querySelector('#open-banking-question').open = true; });
});
