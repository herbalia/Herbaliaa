-- در Supabase: SQL Editor > New query > این متن را بچسبانید و Run بزنید

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  price bigint,
  description text,
  image text,
  created_at timestamptz default now()
);

alter table public.products enable row level security;
create policy "همه می‌توانند محصولات را ببینند" on public.products for select using (true);
create policy "فقط مدیر وارد شده می‌تواند تغییر دهد" on public.products for all to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true) on conflict do nothing;
create policy "عکس‌ها عمومی‌اند" on storage.objects for select using (bucket_id = 'product-images');
create policy "آپلود فقط مدیر" on storage.objects for insert to authenticated with check (bucket_id = 'product-images');
create policy "حذف عکس فقط مدیر" on storage.objects for delete to authenticated using (bucket_id = 'product-images');

insert into public.products (name, category, price, description) values
 ('روغن بست‌کیور','روغن‌های گیاهی',444000,'فرآورده روغنی؛ برای مشاهده ترکیبات و شیوه مصرف، توضیحات محصول را بررسی کنید.'),
 ('محصولات نازله','مراقبت و سلامت',400000,'بسته ۳۰ عددی؛ اطلاعات تکمیلی و ترکیبات را پیش از خرید بررسی کنید.'),
 ('چوب صندل','گیاهان و فرآورده‌ها',null,'محصول گیاهی؛ قیمت و موجودی را از هربالیا استعلام کنید.'),
 ('جاوی','گیاهان و فرآورده‌ها',null,'در رنگ‌بندی‌های مختلف؛ برای اطلاع از موجودی پیام دهید.');
