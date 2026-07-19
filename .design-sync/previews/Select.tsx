import { Select } from '@woodworking-plan/ui';

export function SortControl() {
  return (
    <Select defaultValue="trending" aria-label="Sort plans">
      <option value="trending">Trending</option>
      <option value="popular">Most liked</option>
      <option value="newest">Newest</option>
      <option value="viewed">Most viewed</option>
    </Select>
  );
}

export function FullWidth() {
  return (
    <div style={{ width: '18rem', maxWidth: '100%' }}>
      <Select fullWidth defaultValue="all" aria-label="Category">
        <option value="all">All categories</option>
        <option value="storage">Storage &amp; shelving</option>
        <option value="outdoor">Outdoor</option>
        <option value="furniture">Furniture</option>
      </Select>
    </div>
  );
}
