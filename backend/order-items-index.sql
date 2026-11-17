-- Cover order-item product FK for history queries and future admin reporting.
create index if not exists homly_order_items_product_idx on public.homly_order_items(product_id);
