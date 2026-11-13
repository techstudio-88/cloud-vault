-- CloudVault pricing defaults for the Indian market.
-- Yearly prices are annual totals (not monthly equivalents).
update public.subscription_plans
set monthly_price_inr = case id
  when 'free' then 0
  when 'pro' then 199
  when 'team' then 499
  else monthly_price_inr
end,
yearly_price_inr = case id
  when 'free' then 0
  when 'pro' then 1999
  when 'team' then 4999
  else yearly_price_inr
end
where id in ('free','pro','team');
