export default function Faq({ faqItems }) {
  return (
    <section className="section faq">
      <div className="container faq-grid">
        <div className="reveal">
          <p className="eyebrow">Questions, answered</p>
          <h2>
            Good things take <i>care.</i>
          </h2>
          <p>Have something specific in mind? We’re always happy to help you choose the perfect box.</p>
          <a className="text-link whatsapp-link" href="https://wa.me/c/918319510666" target="_blank" rel="noreferrer">
            Ask us on WhatsApp <span>↗</span>
          </a>
        </div>

        <div className="accordion reveal">
          {faqItems.map((item, index) => (
            <details key={item.question} open={index === 0}>
              <summary>
                {item.question}
                <span>+</span>
              </summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
