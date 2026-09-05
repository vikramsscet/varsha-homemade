export default function Reviews({ reviews }) {
  return (
    <section className="section reviews">
      <div className="container">
        <div className="rating reveal">
          <span>★★★★★</span>
          <b>4.9/5</b>
          <p>From happy customers across the city</p>
        </div>

        <div className="review-grid">
          {reviews.map((review) => (
            <blockquote key={review.name} className="reveal">
              <div>★★★★★</div>
              <p>“{review.text}”</p>
              <footer>
                <span>{review.initials}</span>
                <b>{review.name}</b>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
