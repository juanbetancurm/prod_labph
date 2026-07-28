import { Link } from "react-router-dom";
import { firstPhoto, formatQuantityFromCounts } from "../lib/format.js";

export function ItemCard({ item }) {
  const photo = firstPhoto(item);

  return (
    <article className="item-card">
      <Link className="item-card__image" to={`/inventory/${item.id}`}>
        {photo ? <img src={photo.publicPath} alt="" loading="lazy" /> : <span>No photo</span>}
      </Link>
      <div className="item-card__body">
        <div className="eyebrow-row">
          <span>{item.source}</span>
          <span>{item.category}</span>
        </div>
        <h3>
          <Link to={`/inventory/${item.id}`}>{item.name}</Link>
        </h3>
        <p className="muted">{item.section}</p>
        <p>{formatQuantityFromCounts(item.counts)}</p>
      </div>
    </article>
  );
}
