import Breadcrumbs from '../Breadcrumbs';

export default function CategoryHeader() {
  return (
    <div className="category-header">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Indian Sweets' }]} />
      <h1>Indian Sweets</h1>
    </div>
  );
}
