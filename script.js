const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

window.addEventListener('load', () => $('.loader').classList.add('loaded'));

const menuButton = $('.menu-toggle');
const navLinks = $('.nav-links');
menuButton.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  document.body.classList.toggle('menu-open', isOpen);
  menuButton.setAttribute('aria-expanded', isOpen);
});
$$('.nav-links a').forEach(link => link.addEventListener('click', () => {
  navLinks.classList.remove('open'); document.body.classList.remove('menu-open'); menuButton.setAttribute('aria-expanded', 'false');
}));

const observer = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
}), { threshold: .13 });
$$('.reveal').forEach(element => observer.observe(element));

const topButton = $('.to-top');
window.addEventListener('scroll', () => topButton.classList.toggle('show', window.scrollY > 600));
topButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

const lightbox = $('.lightbox');
const lightboxImage = $('img', lightbox);
$$('.gallery-item').forEach(item => item.addEventListener('click', () => {
  lightboxImage.src = item.dataset.full; lightboxImage.alt = $('img', item).alt; lightbox.classList.add('open');
}));
const closeLightbox = () => lightbox.classList.remove('open');
$('.lightbox button').addEventListener('click', closeLightbox);
lightbox.addEventListener('click', event => { if (event.target === lightbox) closeLightbox(); });
window.addEventListener('keydown', event => { if (event.key === 'Escape') closeLightbox(); });
